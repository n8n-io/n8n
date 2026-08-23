import type { Mock } from 'vitest';

import type {
	WorkflowBuildOutcome,
	WorkflowLoopState,
	AttemptRecord,
} from '../../workflow-loop/workflow-loop-state';
import { patchThread, type PatchableThreadMemory } from '../thread-patch';
import type * as ThreadPatch from '../thread-patch';
import { WorkflowLoopStorage } from '../workflow-loop-storage';

vi.mock('../thread-patch', async () => {
	const actual = await vi.importActual<typeof ThreadPatch>('../thread-patch');

	return {
		...actual,
		patchThread: vi.fn(),
	};
});

const mockedPatchThread = vi.mocked(patchThread);
type TestMemory = PatchableThreadMemory & { getThread: Mock };

function makeMemory(): TestMemory {
	return {
		getThread: vi.fn(),
	};
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

function makeOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi-1',
		runId: 'run-1',
		taskId: 'task-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Submitted.',
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
	let memory: TestMemory;
	let storage: WorkflowLoopStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		memory = makeMemory();
		storage = new WorkflowLoopStorage(memory);
	});

	describe('getWorkItem', () => {
		it('returns work item from thread metadata', async () => {
			const state = makeState();
			const attempts = [makeAttempt()];
			vi.mocked(memory.getThread).mockResolvedValue({
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
			vi.mocked(memory.getThread).mockResolvedValue({
				...baseThread,
				metadata: {
					instanceAiWorkflowLoop: {},
				},
			});

			expect(await storage.getWorkItem('thread-1', 'unknown')).toBeNull();
		});

		it('returns null when no loop metadata exists', async () => {
			vi.mocked(memory.getThread).mockResolvedValue({
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

	describe('setup routing claims', () => {
		it('claims an unrouted direct work item', async () => {
			const state = makeState({ status: 'completed', phase: 'done', workflowId: 'wf-1' });

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {
						instanceAiWorkflowLoop: {
							'wi-1': { state, attempts: [] },
						},
					},
				});
				const next = result?.metadata?.instanceAiWorkflowLoop as Record<
					string,
					{ state: WorkflowLoopState }
				>;
				expect(next['wi-1'].state).toEqual(
					expect.objectContaining({
						setupRoutingClaimId: 'claim-1',
						setupRoutingClaimedAt: '2026-01-01T00:00:00.000Z',
						setupRoutingClaimExpiresAt: '2026-01-01T00:15:00.000Z',
					}),
				);
				return baseThread as never;
			});

			const claimed = await storage.claimSetupRouting('thread-1', 'wi-1', {
				claimId: 'claim-1',
				claimedAt: '2026-01-01T00:00:00.000Z',
				expiresAt: '2026-01-01T00:15:00.000Z',
			});

			expect(claimed?.state.setupRoutingClaimId).toBe('claim-1');
		});

		it('does not claim a planned work item', async () => {
			const state = makeState({
				status: 'completed',
				phase: 'done',
				workflowId: 'wf-1',
				plannedTaskId: 'planned-1',
			});

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {
						instanceAiWorkflowLoop: {
							'wi-1': { state, attempts: [] },
						},
					},
				});
				expect(result).toBeNull();
				return baseThread as never;
			});

			const claimed = await storage.claimSetupRouting('thread-1', 'wi-1', {
				claimId: 'claim-1',
				claimedAt: '2026-01-01T00:00:00.000Z',
				expiresAt: '2026-01-01T00:15:00.000Z',
			});

			expect(claimed).toBeNull();
		});

		it('does not claim a work item with a planned owner', async () => {
			const state = makeState({
				status: 'completed',
				phase: 'done',
				workflowId: 'wf-1',
				owner: { type: 'planned', taskId: 'planned-1' },
			});

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {
						instanceAiWorkflowLoop: {
							'wi-1': { state, attempts: [] },
						},
					},
				});
				expect(result).toBeNull();
				return baseThread as never;
			});

			const claimed = await storage.claimSetupRouting('thread-1', 'wi-1', {
				claimId: 'claim-1',
				claimedAt: '2026-01-01T00:00:00.000Z',
				expiresAt: '2026-01-01T00:15:00.000Z',
			});

			expect(claimed).toBeNull();
		});

		it('does not claim a work item whose last outcome belongs to a planned task', async () => {
			const state = makeState({
				status: 'completed',
				phase: 'done',
				workflowId: 'wf-1',
			});
			const lastBuildOutcome = makeOutcome({ plannedTaskId: 'planned-1' });

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {
						instanceAiWorkflowLoop: {
							'wi-1': { state, attempts: [], lastBuildOutcome },
						},
					},
				});
				expect(result).toBeNull();
				return baseThread as never;
			});

			const claimed = await storage.claimSetupRouting('thread-1', 'wi-1', {
				claimId: 'claim-1',
				claimedAt: '2026-01-01T00:00:00.000Z',
				expiresAt: '2026-01-01T00:15:00.000Z',
			});

			expect(claimed).toBeNull();
		});

		it('marks setup routed for the matching claim and clears the claim', async () => {
			const state = makeState({
				status: 'completed',
				phase: 'done',
				workflowId: 'wf-1',
				setupRoutingClaimId: 'claim-1',
				setupRoutingClaimedAt: '2026-01-01T00:00:00.000Z',
				setupRoutingClaimExpiresAt: '2026-01-01T00:15:00.000Z',
			});

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {
						instanceAiWorkflowLoop: {
							'wi-1': { state, attempts: [] },
						},
					},
				});
				const next = result?.metadata?.instanceAiWorkflowLoop as Record<
					string,
					{ state: WorkflowLoopState }
				>;
				expect(next['wi-1'].state.setupRoutedAt).toBe('2026-01-01T00:01:00.000Z');
				expect(next['wi-1'].state.setupRoutingClaimId).toBeUndefined();
				return baseThread as never;
			});

			await expect(
				storage.markSetupRouted('thread-1', 'wi-1', 'claim-1', '2026-01-01T00:01:00.000Z'),
			).resolves.toBe(true);
		});

		it('releases the matching setup routing claim', async () => {
			const state = makeState({
				status: 'completed',
				phase: 'done',
				workflowId: 'wf-1',
				setupRoutingClaimId: 'claim-1',
				setupRoutingClaimedAt: '2026-01-01T00:00:00.000Z',
				setupRoutingClaimExpiresAt: '2026-01-01T00:15:00.000Z',
			});

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					...baseThread,
					metadata: {
						instanceAiWorkflowLoop: {
							'wi-1': { state, attempts: [] },
						},
					},
				});
				const next = result?.metadata?.instanceAiWorkflowLoop as Record<
					string,
					{ state: WorkflowLoopState }
				>;
				expect(next['wi-1'].state.setupRoutingClaimId).toBeUndefined();
				expect(next['wi-1'].state.setupRoutedAt).toBeUndefined();
				return baseThread as never;
			});

			await storage.releaseSetupRoutingClaim('thread-1', 'wi-1', 'claim-1');
		});
	});

	describe('getActiveWorkItem', () => {
		it('returns the active work item', async () => {
			const activeState = makeState({ workItemId: 'wi-active', status: 'active' });
			const doneState = makeState({ workItemId: 'wi-done', status: 'completed' });

			vi.mocked(memory.getThread).mockResolvedValue({
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

			vi.mocked(memory.getThread).mockResolvedValue({
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
			vi.mocked(memory.getThread).mockResolvedValue({
				...baseThread,
				metadata: {},
			});

			expect(await storage.getActiveWorkItem('thread-1')).toBeNull();
		});
	});

	describe('listWorkItems', () => {
		it('returns all stored work items', async () => {
			const firstState = makeState({ workItemId: 'wi-1' });
			const secondState = makeState({ workItemId: 'wi-2' });

			vi.mocked(memory.getThread).mockResolvedValue({
				...baseThread,
				metadata: {
					instanceAiWorkflowLoop: {
						'wi-1': { state: firstState, attempts: [] },
						'wi-2': { state: secondState, attempts: [] },
					},
				},
			});

			const result = await storage.listWorkItems('thread-1');

			expect(result.map((record) => record.state.workItemId)).toEqual(['wi-1', 'wi-2']);
		});
	});
});
