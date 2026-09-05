import type { ThreadPatch, ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext } from '../../../types';
import {
	getObservedWorkflowChecksum,
	rememberCurrentWorkflowChecksum,
	rememberObservedWorkflowChecksum,
} from '../observed-workflow-checksums';

/** Thread store shared across contexts, the way one conversation spans several runs. */
function createThreadMemory() {
	const threads = new Map<string, ThreadRecord>();

	return {
		getThread: vi.fn(
			async (threadId: string) => await Promise.resolve(threads.get(threadId) ?? null),
		),
		patchThread: vi.fn(
			async ({
				threadId,
				update,
			}: {
				threadId: string;
				update: (current: ThreadRecord) => ThreadPatch | null | undefined;
			}) => {
				const current: ThreadRecord = threads.get(threadId) ?? {
					id: threadId,
					metadata: {},
					resourceId: 'resource-1',
					createdAt: new Date('2026-01-01'),
					updatedAt: new Date('2026-01-01'),
				};
				const patch = update(current);
				if (!patch) return null;
				const next = { ...current, metadata: patch.metadata ?? current.metadata };
				threads.set(threadId, next);
				return await Promise.resolve(next);
			},
		),
	};
}

/** Each Instance AI run builds a fresh context, so a turn is a new context object. */
function createContextForRun(threadMemory: ReturnType<typeof createThreadMemory>) {
	return {
		threadId: 'thread-1',
		threadMemory,
		logger: { debug: vi.fn(), warn: vi.fn() },
	} as unknown as InstanceAiContext;
}

describe('observed workflow checksums', () => {
	it('carries the observed checksum into later turns of the same conversation', async () => {
		const threadMemory = createThreadMemory();

		await rememberObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1', 'checksum-1');

		await expect(
			getObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1'),
		).resolves.toBe('checksum-1');
	});

	it('keeps checksums separate per workflow', async () => {
		const threadMemory = createThreadMemory();
		const context = createContextForRun(threadMemory);

		await rememberObservedWorkflowChecksum(context, 'wf-1', 'checksum-1');
		await rememberObservedWorkflowChecksum(context, 'wf-2', 'checksum-2');

		await expect(
			getObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-2'),
		).resolves.toBe('checksum-2');
	});

	it('forgets the checksum in later turns when a save reports none', async () => {
		const threadMemory = createThreadMemory();

		await rememberObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1', 'checksum-1');
		await rememberObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1', undefined);

		await expect(
			getObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1'),
		).resolves.toBeUndefined();
	});

	it('has no expectation for a workflow this conversation never observed', async () => {
		const threadMemory = createThreadMemory();

		await expect(
			getObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-unknown'),
		).resolves.toBeUndefined();
	});

	it('still remembers within a run when the conversation has no thread memory', async () => {
		const context = { logger: { debug: vi.fn(), warn: vi.fn() } } as unknown as InstanceAiContext;

		await rememberObservedWorkflowChecksum(context, 'wf-1', 'checksum-1');

		await expect(getObservedWorkflowChecksum(context, 'wf-1')).resolves.toBe('checksum-1');
	});

	it('has no expectation when the thread copy cannot be read', async () => {
		const threadMemory = createThreadMemory();
		await rememberObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1', 'checksum-1');

		const laterRun = createContextForRun(threadMemory);
		threadMemory.getThread.mockRejectedValue(new Error('thread store is down'));

		// An unguarded save beats blocking the agent on unreadable bookkeeping.
		await expect(getObservedWorkflowChecksum(laterRun, 'wf-1')).resolves.toBeUndefined();
	});

	it('records no expectation when the workflow itself cannot be read', async () => {
		const context = {
			threadId: 'thread-1',
			threadMemory: createThreadMemory(),
			logger: { debug: vi.fn(), warn: vi.fn() },
			workflowService: { get: vi.fn().mockRejectedValue(new Error('workflow is gone')) },
		} as unknown as InstanceAiContext;

		await expect(rememberCurrentWorkflowChecksum(context, 'wf-1')).resolves.toBeUndefined();
		await expect(getObservedWorkflowChecksum(context, 'wf-1')).resolves.toBeUndefined();
	});

	it('prefers what this run observed over a stale thread copy', async () => {
		const threadMemory = createThreadMemory();
		await rememberObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1', 'checksum-1');

		// A later run re-reads the workflow, but the thread write does not land.
		const laterRun = createContextForRun(threadMemory);
		threadMemory.patchThread.mockRejectedValue(new Error('thread store is down'));
		await rememberObservedWorkflowChecksum(laterRun, 'wf-1', 'checksum-2');

		await expect(getObservedWorkflowChecksum(laterRun, 'wf-1')).resolves.toBe('checksum-2');
	});

	it('does not fall back to a stale thread copy after a failed clear', async () => {
		const threadMemory = createThreadMemory();
		await rememberObservedWorkflowChecksum(createContextForRun(threadMemory), 'wf-1', 'checksum-1');

		const laterRun = createContextForRun(threadMemory);
		threadMemory.patchThread.mockRejectedValue(new Error('thread store is down'));
		await rememberObservedWorkflowChecksum(laterRun, 'wf-1', undefined);

		await expect(getObservedWorkflowChecksum(laterRun, 'wf-1')).resolves.toBeUndefined();
	});

	it('keeps the run-local checksum when persisting to the thread fails', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.patchThread.mockRejectedValue(new Error('thread store is down'));
		const context = createContextForRun(threadMemory);

		await rememberObservedWorkflowChecksum(context, 'wf-1', 'checksum-1');

		await expect(getObservedWorkflowChecksum(context, 'wf-1')).resolves.toBe('checksum-1');
	});
});
