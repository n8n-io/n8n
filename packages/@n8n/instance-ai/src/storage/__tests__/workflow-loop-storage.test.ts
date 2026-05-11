import type { Memory } from '@mastra/memory';

jest.mock('../thread-patch', () => ({
	patchThread: jest.fn(),
}));

import type { WorkflowLoopState, AttemptRecord } from '../../workflow-loop/workflow-loop-state';
import { patchThread } from '../thread-patch';
import { WorkflowLoopStorage } from '../workflow-loop-storage';

const mockedPatchThread = jest.mocked(patchThread);

function makeMemory(): Memory {
	return {
		getThreadById: jest.fn(),
	} as unknown as Memory;
}

function makeState(overrides: Partial<WorkflowLoopState> = {}): WorkflowLoopState {
	return {
		workItemId: 'wi-1',
		threadId: 'thread-1',
		status: 'active',
		phase: 'building',
		source: 'create',
		rebuildAttempts: 0,
		...overrides,
	};
}

function makeAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
	return {
		workItemId: 'wi-1',
		phase: 'building',
		attempt: 1,
		action: 'build',
		result: 'success',
		createdAt: '2026-01-01T00:00:00Z',
		...overrides,
	};
}

const baseThread = {
	id: 'thread-1',
	title: 'Test',
	resourceId: 'res-1',
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe('WorkflowLoopStorage', () => {
	let memory: Memory;
	let storage: WorkflowLoopStorage;

	beforeEach(() => {
		jest.clearAllMocks();
		memory = makeMemory();
		storage = new WorkflowLoopStorage(memory);
	});

	describe('getWorkItem', () => {
		it('returns work item from thread metadata', async () => {
			const state = makeState();
			const attempts = [makeAttempt()];
			jest.mocked(memory.getThreadById).mockResolvedValue({
				...baseThread,
				metadata: {
					instanceAiWorkflowLoop: {
						'wi-1': { state, attempts },
					},
				},
			});

			const result = await storage.getWorkItem('thread-1', 'wi-1');

			expect(result).toEqual({ state, attempts });
		});

		it('returns null for unknown work item', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue({
				...baseThread,
				metadata: {
					instanceAiWorkflowLoop: {},
				},
			});

			expect(await storage.getWorkItem('thread-1', 'unknown')).toBeNull();
		});

		it('returns null when no loop metadata exists', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue({
				...baseThread,
				metadata: {},
			});

			expect(await storage.getWorkItem('thread-1', 'wi-1')).toBeNull();
		});
	});

	describe('saveWorkItem', () => {
		it('saves work item to thread metadata', async () => {
			const state = makeState();
			const attempts = [makeAttempt()];

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {},
				});
				expect(result?.metadata?.instanceAiWorkflowLoop).toEqual({
					'wi-1': { state, attempts, lastBuildOutcome: undefined },
				});
				return baseThread as never;
			});

			await storage.saveWorkItem('thread-1', state, attempts);
			expect(mockedPatchThread).toHaveBeenCalled();
		});

		it('preserves existing work items', async () => {
			const existingState = makeState({ workItemId: 'wi-existing', status: 'completed' });
			const newState = makeState({ workItemId: 'wi-2' });

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {
						instanceAiWorkflowLoop: {
							'wi-existing': { state: existingState, attempts: [] },
						},
					},
				});
				const loop = result?.metadata?.instanceAiWorkflowLoop as Record<string, unknown>;
				expect(loop['wi-existing']).toBeDefined();
				expect(loop['wi-2']).toBeDefined();
				return baseThread as never;
			});

			await storage.saveWorkItem('thread-1', newState, []);
		});
	});

	describe('getActiveWorkItem', () => {
		it('returns the active work item', async () => {
			const activeState = makeState({ workItemId: 'wi-active', status: 'active' });
			const doneState = makeState({ workItemId: 'wi-done', status: 'completed' });

			jest.mocked(memory.getThreadById).mockResolvedValue({
				...baseThread,
				metadata: {
					instanceAiWorkflowLoop: {
						'wi-done': { state: doneState, attempts: [] },
						'wi-active': { state: activeState, attempts: [] },
					},
				},
			});

			const result = await storage.getActiveWorkItem('thread-1');
			expect(result?.state.workItemId).toBe('wi-active');
		});

		it('returns null when no active work item exists', async () => {
			const doneState = makeState({ workItemId: 'wi-done', status: 'completed' });

			jest.mocked(memory.getThreadById).mockResolvedValue({
				...baseThread,
				metadata: {
					instanceAiWorkflowLoop: {
						'wi-done': { state: doneState, attempts: [] },
					},
				},
			});

			expect(await storage.getActiveWorkItem('thread-1')).toBeNull();
		});

		it('returns null when no loop metadata', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue({
				...baseThread,
				metadata: {},
			});

			expect(await storage.getActiveWorkItem('thread-1')).toBeNull();
		});
	});
});
