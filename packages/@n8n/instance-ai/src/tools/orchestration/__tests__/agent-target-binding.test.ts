import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext } from '../../../types';
import {
	getSessionAgentByRef,
	normalizeAgentRef,
	PENDING_AGENT_METADATA_KEY,
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
} from '../agent-target-binding';

/** In-memory thread store shared across "turns" (fresh contexts). */
function createThreadMemory(initialMetadata: Record<string, unknown> = {}) {
	const thread: ThreadRecord = {
		id: 'thread-1',
		metadata: initialMetadata,
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	return {
		getThread: vi.fn<() => Promise<ThreadRecord>>().mockResolvedValue(thread),
		patchThread: vi.fn().mockImplementation(
			async (args: {
				update: (current: ThreadRecord) => { metadata?: Record<string, unknown> };
			}) => {
				const patch = args.update({ ...thread, metadata: { ...(thread.metadata ?? {}) } });
				if (patch?.metadata) thread.metadata = patch.metadata;
				return await Promise.resolve(thread);
			},
		),
	};
}

function createContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		threadId: 'thread-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

const TARGET = { agentId: 'agent-1', projectId: 'project-1', ref: 'support-triage' };

describe('normalizeAgentRef', () => {
	it('slugifies casing, whitespace, and punctuation to the same key', () => {
		expect(normalizeAgentRef('Support Triage')).toBe('support-triage');
		expect(normalizeAgentRef('support_triage')).toBe('support-triage');
		expect(normalizeAgentRef('  Support-Triage  ')).toBe('support-triage');
	});

	it('keeps non-Latin names addressable instead of slugifying them away', () => {
		expect(normalizeAgentRef('支持代理')).toBe('支持代理');
		expect(normalizeAgentRef('Служба поддержки')).toBe('служба-поддержки');
	});
});

describe('agent-builder target binding', () => {
	it('round-trips the target through thread metadata across contexts', async () => {
		const threadMemory = createThreadMemory();
		await saveAgentBuilderTarget(createContext({ threadMemory }), TARGET);

		const nextTurn = createContext({ threadMemory });
		await expect(resolveAgentBuilderTarget(nextTurn)).resolves.toEqual({
			...TARGET,
			ref: 'support-triage',
		});
		expect(nextTurn.agentBuilderTarget).toEqual({ ...TARGET, ref: 'support-triage' });
	});

	it('prefers the in-memory context target over the persisted binding', async () => {
		const threadMemory = createThreadMemory({
			instanceAiAgentBuilderTarget: { agentId: 'agent-old', projectId: 'project-1' },
		});
		const context = createContext({ threadMemory, agentBuilderTarget: TARGET });
		await expect(resolveAgentBuilderTarget(context)).resolves.toEqual(TARGET);
	});

	it('returns undefined for missing or invalid metadata', async () => {
		const missing = createContext({ threadMemory: createThreadMemory() });
		await expect(resolveAgentBuilderTarget(missing)).resolves.toBeUndefined();

		const invalid = createContext({
			threadMemory: createThreadMemory({ instanceAiAgentBuilderTarget: { agentId: 42 } }),
		});
		await expect(resolveAgentBuilderTarget(invalid)).resolves.toBeUndefined();
	});

	it('warns and no-ops when saving without thread persistence available', async () => {
		const context = createContext({ threadMemory: undefined, threadId: undefined });
		await saveAgentBuilderTarget(context, TARGET);
		expect(context.logger?.warn).toHaveBeenCalledWith(
			expect.stringContaining('no thread persistence available'),
			expect.objectContaining({ agentId: TARGET.agentId }),
		);
	});

	it('propagates a metadata read failure instead of falling back to undefined', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.getThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createContext({ threadMemory });

		await expect(resolveAgentBuilderTarget(context)).rejects.toThrow('storage unavailable');
		expect(context.agentBuilderTarget).toBeUndefined();
	});

	it('clears the pending new-agent marker once a real agent binds, keeping other metadata', async () => {
		const threadMemory = createThreadMemory({
			[PENDING_AGENT_METADATA_KEY]: { projectId: 'project-1' },
			someOtherKey: 'keep me',
		});

		await saveAgentBuilderTarget(createContext({ threadMemory }), TARGET);

		const thread: ThreadRecord = await threadMemory.getThread();
		expect(thread.metadata).not.toHaveProperty(PENDING_AGENT_METADATA_KEY);
		expect(thread.metadata?.someOtherKey).toBe('keep me');
	});

	it('propagates a metadata write failure instead of claiming success', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.patchThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createContext({ threadMemory });

		await expect(saveAgentBuilderTarget(context, TARGET)).rejects.toThrow('storage unavailable');
	});

	describe('session agent registry', () => {
		it('saves then resolves by ref', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Support Triage',
				ref: 'support-triage',
			});

			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'Support_Triage'),
			).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Support Triage',
				ref: 'support-triage',
			});
		});

		it('keeps the addressing ref when a later save changes only the display name', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Renamed Tracker',
			});

			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'tracker'),
			).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Renamed Tracker',
				ref: 'tracker',
			});
		});

		it('preserves the registered name when a later save for the same agent carries none', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				ref: 'tracker',
			});

			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'tracker'),
			).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
			await expect(resolveAgentBuilderTarget(createContext({ threadMemory }))).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
		});

		it('returns undefined for unknown refs, missing persistence, and malformed registries', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'First',
				ref: 'first',
			});
			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'unknown'),
			).resolves.toBeUndefined();

			const noPersistence = createContext({ threadMemory: undefined, threadId: undefined });
			await expect(getSessionAgentByRef(noPersistence, 'first')).resolves.toBeUndefined();

			const malformed = createContext({
				threadMemory: createThreadMemory({ instanceAiAgentBuilderTargets: 'garbage' }),
			});
			await expect(getSessionAgentByRef(malformed, 'first')).resolves.toBeUndefined();
		});
	});
});
