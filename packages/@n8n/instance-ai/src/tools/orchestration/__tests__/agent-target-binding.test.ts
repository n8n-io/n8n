import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext } from '../../../types';
import { resolveAgentBuilderTarget, saveAgentBuilderTarget } from '../agent-target-binding';

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
});
