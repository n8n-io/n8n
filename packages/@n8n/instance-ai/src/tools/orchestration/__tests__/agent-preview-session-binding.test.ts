import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext } from '../../../types';
import {
	resolveAgentPreviewSession,
	saveAgentPreviewSession,
} from '../agent-preview-session-binding';

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

const SESSION = { agentId: 'agent-1', threadId: 'preview-thread-1' };

describe('agent-preview session binding', () => {
	it('round-trips the session through thread metadata across contexts', async () => {
		const threadMemory = createThreadMemory();
		await saveAgentPreviewSession(createContext({ threadMemory }), SESSION);

		const nextTurn = createContext({ threadMemory });
		await expect(resolveAgentPreviewSession(nextTurn)).resolves.toEqual(SESSION);
		expect(nextTurn.agentPreviewSession).toEqual(SESSION);
	});

	it('persists an optional executionId', async () => {
		const session = { ...SESSION, executionId: 'exec-9' };
		const threadMemory = createThreadMemory();
		await saveAgentPreviewSession(createContext({ threadMemory }), session);

		const nextTurn = createContext({ threadMemory });
		await expect(resolveAgentPreviewSession(nextTurn)).resolves.toEqual(session);
	});

	it('prefers the in-memory context session over the persisted binding', async () => {
		const threadMemory = createThreadMemory({
			instanceAiAgentPreviewSession: { agentId: 'agent-old', threadId: 'preview-old' },
		});
		const context = createContext({ threadMemory, agentPreviewSession: SESSION });
		await expect(resolveAgentPreviewSession(context)).resolves.toEqual(SESSION);
	});

	it('returns undefined for missing or invalid metadata', async () => {
		const missing = createContext({ threadMemory: createThreadMemory() });
		await expect(resolveAgentPreviewSession(missing)).resolves.toBeUndefined();

		const invalid = createContext({
			threadMemory: createThreadMemory({ instanceAiAgentPreviewSession: { agentId: 42 } }),
		});
		await expect(resolveAgentPreviewSession(invalid)).resolves.toBeUndefined();
	});

	it('warns and no-ops when saving without thread persistence available', async () => {
		const context = createContext({ threadMemory: undefined, threadId: undefined });
		await saveAgentPreviewSession(context, SESSION);
		expect(context.logger?.warn).toHaveBeenCalledWith(
			expect.stringContaining('no thread persistence available'),
			expect.objectContaining({ agentId: SESSION.agentId }),
		);
	});

	it('propagates a metadata read failure instead of falling back to undefined', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.getThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createContext({ threadMemory });

		await expect(resolveAgentPreviewSession(context)).rejects.toThrow('storage unavailable');
		expect(context.agentPreviewSession).toBeUndefined();
	});

	it('propagates a metadata write failure instead of claiming success', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.patchThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createContext({ threadMemory });

		await expect(saveAgentPreviewSession(context, SESSION)).rejects.toThrow('storage unavailable');
	});
});
