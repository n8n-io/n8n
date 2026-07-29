import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext } from '../../../types';
import {
	findSessionAgentByName,
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
		getThread: vi.fn().mockResolvedValue(thread),
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

const TARGET = { agentId: 'agent-1', projectId: 'project-1' };

describe('agent-builder target binding', () => {
	it('round-trips the target through thread metadata across contexts', async () => {
		const threadMemory = createThreadMemory();
		await saveAgentBuilderTarget(createContext({ threadMemory }), TARGET);

		// A fresh context (next turn) resolves the persisted target and hydrates itself.
		const nextTurn = createContext({ threadMemory });
		await expect(resolveAgentBuilderTarget(nextTurn)).resolves.toEqual(TARGET);
		expect(nextTurn.agentBuilderTarget).toEqual(TARGET);
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

	it('propagates a metadata write failure instead of claiming success', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.patchThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createContext({ threadMemory });

		await expect(saveAgentBuilderTarget(context, TARGET)).rejects.toThrow('storage unavailable');
	});

	describe('session agent registry', () => {
		it('upserts every saved target into the session registry', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'First',
			});
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-2',
				projectId: 'p',
				name: 'Second',
			});
			// Re-saving agent-1 under a new name replaces its old registry entry.
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Renamed',
			});

			const lookupContext = createContext({ threadMemory });
			await expect(findSessionAgentByName(lookupContext, 'Second')).resolves.toEqual({
				agentId: 'agent-2',
				projectId: 'p',
				name: 'Second',
			});
			await expect(findSessionAgentByName(lookupContext, 'Renamed')).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Renamed',
			});
			await expect(findSessionAgentByName(lookupContext, 'First')).resolves.toBeUndefined();
		});

		it('preserves the registered name when a later save for the same agent carries none', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
			});
			// Simulates an agentId-path switch, which carries no name.
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
			});

			await expect(
				findSessionAgentByName(createContext({ threadMemory }), 'Tracker'),
			).resolves.toEqual({ agentId: 'agent-1', projectId: 'p', name: 'Tracker' });

			await expect(resolveAgentBuilderTarget(createContext({ threadMemory }))).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
			});
		});

		it('finds the most recently targeted agent when names collide', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'a1',
				projectId: 'p',
				name: 'Dup',
			});
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'a2',
				projectId: 'p',
				name: 'Dup',
			});

			await expect(findSessionAgentByName(createContext({ threadMemory }), 'Dup')).resolves.toEqual(
				{ agentId: 'a2', projectId: 'p', name: 'Dup' },
			);
		});

		it('matches names ignoring case and surrounding whitespace', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Platform Cycle Tracker',
			});

			await expect(
				findSessionAgentByName(createContext({ threadMemory }), '  platform cycle tracker '),
			).resolves.toEqual({ agentId: 'agent-1', projectId: 'p', name: 'Platform Cycle Tracker' });
		});

		it('returns undefined for unknown names, missing persistence, and malformed registries', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'First',
			});
			await expect(
				findSessionAgentByName(createContext({ threadMemory }), 'Unknown'),
			).resolves.toBeUndefined();

			const noPersistence = createContext({ threadMemory: undefined, threadId: undefined });
			await expect(findSessionAgentByName(noPersistence, 'First')).resolves.toBeUndefined();

			const malformed = createContext({
				threadMemory: createThreadMemory({ instanceAiAgentBuilderTargets: 'garbage' }),
			});
			await expect(findSessionAgentByName(malformed, 'First')).resolves.toBeUndefined();
		});
	});
});
