import { nanoid } from 'nanoid';

import type { InstanceAiTraceContext } from '../../types';
import type {
	BackgroundTaskStatusSnapshot,
	ConfirmationData,
	PendingConfirmation,
	SuspendedRunState,
} from '../run-state-registry';
import { RunStateRegistry } from '../run-state-registry';

jest.mock('nanoid', () => ({
	nanoid: jest.fn(),
}));

const mockedNanoid = jest.mocked(nanoid);

interface TestUser {
	id: string;
	name: string;
}

function createSuspendedRunState(
	overrides: Partial<SuspendedRunState<TestUser>> = {},
): SuspendedRunState<TestUser> {
	return {
		runId: 'run_abc',
		abortController: new AbortController(),
		mastraRunId: 'mastra-1',
		agent: {},
		threadId: 'thread-1',
		user: { id: 'user-1', name: 'Alice' },
		toolCallId: 'tool-call-1',
		requestId: 'request-1',
		createdAt: Date.now(),
		...overrides,
	};
}

function createBackgroundTask(
	overrides: Partial<BackgroundTaskStatusSnapshot> = {},
): BackgroundTaskStatusSnapshot {
	return {
		taskId: 'task-1',
		role: 'builder',
		agentId: 'agent-1',
		status: 'running',
		startedAt: Date.now(),
		runId: 'run_abc',
		threadId: 'thread-1',
		...overrides,
	};
}

describe('RunStateRegistry', () => {
	let registry: RunStateRegistry<TestUser>;
	let nanoidCounter: number;

	beforeEach(() => {
		registry = new RunStateRegistry<TestUser>();
		nanoidCounter = 0;
		mockedNanoid.mockReset();
		mockedNanoid.mockImplementation(() => `id-${++nanoidCounter}`);
	});

	// ── startRun ──────────────────────────────────────────────────────────────

	describe('startRun', () => {
		it('creates run with generated runId and messageGroupId', () => {
			const result = registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
			});

			expect(result.runId).toBe('run_id-1');
			expect(result.messageGroupId).toBe('mg_id-2');
			expect(result.abortController).toBeInstanceOf(AbortController);
		});

		it('stores user for the thread', () => {
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
			});

			expect(registry.getThreadUser('thread-1')).toEqual({ id: 'user-1', name: 'Alice' });
		});

		it('stores research mode when provided', () => {
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
				researchMode: true,
			});

			expect(registry.getThreadResearchMode('thread-1')).toBe(true);
		});

		it('does not store research mode when not provided', () => {
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
			});

			expect(registry.getThreadResearchMode('thread-1')).toBeUndefined();
		});

		it('reuses provided messageGroupId instead of generating one', () => {
			const result = registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
				messageGroupId: 'mg_existing',
			});

			// Only one nanoid call for runId, not for messageGroupId
			expect(result.messageGroupId).toBe('mg_existing');
			expect(result.runId).toBe('run_id-1');
			expect(mockedNanoid).toHaveBeenCalledTimes(1);
		});

		it('cleans up previous message group mapping when no messageGroupId is provided', () => {
			// Start first run - generates mg_id-2
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
			});
			expect(registry.getRunIdsForMessageGroup('mg_id-2')).toEqual(['run_id-1']);

			// Start second run on same thread without messageGroupId - should clean up old group
			const secondResult = registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
			});

			// Old message group should be cleaned up
			expect(registry.getRunIdsForMessageGroup('mg_id-2')).toEqual([]);
			// New message group should have the new run
			expect(registry.getRunIdsForMessageGroup(secondResult.messageGroupId!)).toEqual(['run_id-3']);
		});

		it('does not clean up previous group when messageGroupId is provided (reuse)', () => {
			// Start first run - generates mg_id-2
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
			});

			// Start second run reusing the same group
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
				messageGroupId: 'mg_id-2',
			});

			// Both runs should be tracked under the same group
			expect(registry.getRunIdsForMessageGroup('mg_id-2')).toEqual(['run_id-1', 'run_id-3']);
		});

		it('tracks multiple runIds per message group', () => {
			const sharedGroupId = 'mg_shared';

			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'user-1', name: 'Alice' },
				messageGroupId: sharedGroupId,
			});

			registry.startRun({
				threadId: 'thread-2',
				user: { id: 'user-2', name: 'Bob' },
				messageGroupId: sharedGroupId,
			});

			expect(registry.getRunIdsForMessageGroup(sharedGroupId)).toEqual(['run_id-1', 'run_id-2']);
		});
	});

	// ── State queries ─────────────────────────────────────────────────────────

	describe('state queries', () => {
		describe('hasActiveRun', () => {
			it('returns true when thread has an active run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

				expect(registry.hasActiveRun('thread-1')).toBe(true);
			});

			it('returns false when thread has no active run', () => {
				expect(registry.hasActiveRun('thread-1')).toBe(false);
			});

			it('returns false when thread only has a suspended run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				registry.suspendRun('thread-1', createSuspendedRunState({ threadId: 'thread-1' }));

				expect(registry.hasActiveRun('thread-1')).toBe(false);
			});
		});

		describe('hasSuspendedRun', () => {
			it('returns true when thread has a suspended run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				registry.suspendRun('thread-1', createSuspendedRunState({ threadId: 'thread-1' }));

				expect(registry.hasSuspendedRun('thread-1')).toBe(true);
			});

			it('returns false when thread has no suspended run', () => {
				expect(registry.hasSuspendedRun('thread-1')).toBe(false);
			});

			it('returns false when thread only has an active run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

				expect(registry.hasSuspendedRun('thread-1')).toBe(false);
			});
		});

		describe('hasLiveRun', () => {
			it('returns true when thread has an active run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

				expect(registry.hasLiveRun('thread-1')).toBe(true);
			});

			it('returns true when thread has a suspended run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				registry.suspendRun('thread-1', createSuspendedRunState({ threadId: 'thread-1' }));

				expect(registry.hasLiveRun('thread-1')).toBe(true);
			});

			it('returns false when thread has no runs', () => {
				expect(registry.hasLiveRun('thread-1')).toBe(false);
			});
		});

		describe('getActiveRun', () => {
			it('returns the active run state when present', () => {
				const started = registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
				});
				const activeRun = registry.getActiveRun('thread-1');

				expect(activeRun).toBeDefined();
				expect(activeRun!.runId).toBe(started.runId);
				expect(activeRun!.abortController).toBe(started.abortController);
			});

			it('returns undefined when no active run', () => {
				expect(registry.getActiveRun('thread-1')).toBeUndefined();
			});
		});

		describe('getActiveRunId', () => {
			it('returns the runId of the active run', () => {
				const started = registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
				});

				expect(registry.getActiveRunId('thread-1')).toBe(started.runId);
			});

			it('returns undefined when no active run', () => {
				expect(registry.getActiveRunId('nonexistent')).toBeUndefined();
			});
		});

		describe('getSuspendedRun', () => {
			it('returns the suspended run state when present', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				const suspendedState = createSuspendedRunState({ threadId: 'thread-1' });
				registry.suspendRun('thread-1', suspendedState);

				const result = registry.getSuspendedRun('thread-1');
				expect(result).toBe(suspendedState);
			});

			it('returns undefined when no suspended run', () => {
				expect(registry.getSuspendedRun('thread-1')).toBeUndefined();
			});
		});

		describe('getThreadUser', () => {
			it('returns the user stored for the thread', () => {
				registry.startRun({
					threadId: 'thread-1',
					user: { id: 'user-1', name: 'Alice' },
				});

				expect(registry.getThreadUser('thread-1')).toEqual({ id: 'user-1', name: 'Alice' });
			});

			it('returns undefined for unknown thread', () => {
				expect(registry.getThreadUser('unknown')).toBeUndefined();
			});
		});

		describe('getThreadResearchMode', () => {
			it('returns the research mode value when set', () => {
				registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
					researchMode: true,
				});

				expect(registry.getThreadResearchMode('thread-1')).toBe(true);
			});

			it('returns false when explicitly set to false', () => {
				registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
					researchMode: false,
				});

				expect(registry.getThreadResearchMode('thread-1')).toBe(false);
			});

			it('returns undefined when not set', () => {
				registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
				});

				expect(registry.getThreadResearchMode('thread-1')).toBeUndefined();
			});
		});
	});

	// ── getThreadStatus ───────────────────────────────────────────────────────

	describe('getThreadStatus', () => {
		it('reflects active run state', () => {
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

			const status = registry.getThreadStatus('thread-1', []);

			expect(status.hasActiveRun).toBe(true);
			expect(status.isSuspended).toBe(false);
			expect(status.backgroundTasks).toEqual([]);
		});

		it('reflects suspended run state', () => {
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			registry.suspendRun('thread-1', createSuspendedRunState({ threadId: 'thread-1' }));

			const status = registry.getThreadStatus('thread-1', []);

			expect(status.hasActiveRun).toBe(false);
			expect(status.isSuspended).toBe(true);
		});

		it('reflects idle state with no runs', () => {
			const status = registry.getThreadStatus('thread-1', []);

			expect(status.hasActiveRun).toBe(false);
			expect(status.isSuspended).toBe(false);
			expect(status.backgroundTasks).toEqual([]);
		});

		it('filters background tasks by threadId', () => {
			const tasks: BackgroundTaskStatusSnapshot[] = [
				createBackgroundTask({ taskId: 'task-1', threadId: 'thread-1' }),
				createBackgroundTask({ taskId: 'task-2', threadId: 'thread-2' }),
				createBackgroundTask({ taskId: 'task-3', threadId: 'thread-1' }),
			];

			const status = registry.getThreadStatus('thread-1', tasks);

			expect(status.backgroundTasks).toHaveLength(2);
			expect(status.backgroundTasks.map((t) => t.taskId)).toEqual(['task-1', 'task-3']);
		});

		it('maps background task fields correctly, stripping threadId', () => {
			const task = createBackgroundTask({
				taskId: 'task-1',
				role: 'builder',
				agentId: 'agent-1',
				status: 'running',
				startedAt: 1000,
				runId: 'run_x',
				messageGroupId: 'mg_y',
				threadId: 'thread-1',
			});

			const status = registry.getThreadStatus('thread-1', [task]);

			expect(status.backgroundTasks[0]).toEqual({
				taskId: 'task-1',
				role: 'builder',
				agentId: 'agent-1',
				status: 'running',
				startedAt: 1000,
				runId: 'run_x',
				messageGroupId: 'mg_y',
			});
			// threadId should not be in the mapped output
			expect(status.backgroundTasks[0]).not.toHaveProperty('threadId');
		});
	});

	// ── Message group tracking ────────────────────────────────────────────────

	describe('message group tracking', () => {
		describe('getMessageGroupId', () => {
			it('returns the stored message group for the thread', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

				expect(registry.getMessageGroupId('thread-1')).toBe('mg_id-2');
			});

			it('returns undefined for unknown thread', () => {
				expect(registry.getMessageGroupId('unknown')).toBeUndefined();
			});
		});

		describe('getLiveMessageGroupId', () => {
			it('returns thread message group when there is an active run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

				const result = registry.getLiveMessageGroupId('thread-1', []);

				expect(result).toBe('mg_id-2');
			});

			it('returns thread message group when there is a suspended run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				registry.suspendRun('thread-1', createSuspendedRunState({ threadId: 'thread-1' }));

				const result = registry.getLiveMessageGroupId('thread-1', []);

				expect(result).toBe('mg_id-2');
			});

			it('falls back to the most recent running background task messageGroupId', () => {
				// No live run
				const tasks = [
					createBackgroundTask({
						threadId: 'thread-1',
						status: 'running',
						startedAt: 1000,
						messageGroupId: 'mg_older',
					}),
					createBackgroundTask({
						threadId: 'thread-1',
						status: 'running',
						startedAt: 2000,
						messageGroupId: 'mg_newer',
					}),
				];

				const result = registry.getLiveMessageGroupId('thread-1', tasks);

				expect(result).toBe('mg_newer');
			});

			it('falls back to stored threadMessageGroupId when no running background tasks match', () => {
				// Start and then clear the active run, but threadMessageGroupId remains
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				registry.clearActiveRun('thread-1');

				const completedTasks = [
					createBackgroundTask({
						threadId: 'thread-1',
						status: 'completed',
						messageGroupId: 'mg_completed',
					}),
				];

				const result = registry.getLiveMessageGroupId('thread-1', completedTasks);

				// No live run, no running background tasks, falls through to threadMessageGroupId
				expect(result).toBe('mg_id-2');
			});

			it('returns undefined when no state exists at all', () => {
				const result = registry.getLiveMessageGroupId('unknown', []);

				expect(result).toBeUndefined();
			});
		});

		describe('getRunIdsForMessageGroup', () => {
			it('returns run IDs tracked under a message group', () => {
				const groupId = 'mg_shared';
				registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
					messageGroupId: groupId,
				});
				registry.startRun({
					threadId: 'thread-2',
					user: { id: 'u2', name: 'B' },
					messageGroupId: groupId,
				});

				expect(registry.getRunIdsForMessageGroup(groupId)).toEqual(['run_id-1', 'run_id-2']);
			});

			it('returns empty array for unknown group', () => {
				expect(registry.getRunIdsForMessageGroup('unknown')).toEqual([]);
			});
		});

		describe('deleteMessageGroup', () => {
			it('removes the message group entry from runIdsByMessageGroup', () => {
				const groupId = 'mg_shared';
				registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
					messageGroupId: groupId,
				});
				expect(registry.getRunIdsForMessageGroup(groupId)).toHaveLength(1);

				registry.deleteMessageGroup(groupId);

				expect(registry.getRunIdsForMessageGroup(groupId)).toEqual([]);
			});

			it('does nothing when group does not exist', () => {
				expect(() => registry.deleteMessageGroup('nonexistent')).not.toThrow();
			});
		});
	});

	// ── Run lifecycle ─────────────────────────────────────────────────────────

	describe('run lifecycle', () => {
		describe('attachTracing', () => {
			it('updates the active run with tracing context', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

				const tracing = {
					projectName: 'test',
				} as unknown as InstanceAiTraceContext;
				registry.attachTracing('thread-1', tracing);

				const activeRun = registry.getActiveRun('thread-1');
				expect(activeRun!.tracing).toBe(tracing);
			});

			it('does nothing when no active run exists', () => {
				const tracing = {
					projectName: 'test',
				} as unknown as InstanceAiTraceContext;

				// Should not throw
				expect(() => registry.attachTracing('nonexistent', tracing)).not.toThrow();
			});

			it('preserves other active run properties', () => {
				const started = registry.startRun({
					threadId: 'thread-1',
					user: { id: 'u1', name: 'A' },
				});

				const tracing = {
					projectName: 'test',
				} as unknown as InstanceAiTraceContext;
				registry.attachTracing('thread-1', tracing);

				const activeRun = registry.getActiveRun('thread-1');
				expect(activeRun!.runId).toBe(started.runId);
				expect(activeRun!.messageGroupId).toBe(started.messageGroupId);
			});
		});

		describe('clearActiveRun', () => {
			it('removes the active run for the thread', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				expect(registry.hasActiveRun('thread-1')).toBe(true);

				registry.clearActiveRun('thread-1');

				expect(registry.hasActiveRun('thread-1')).toBe(false);
				expect(registry.getActiveRun('thread-1')).toBeUndefined();
			});

			it('does nothing when no active run exists', () => {
				expect(() => registry.clearActiveRun('nonexistent')).not.toThrow();
			});
		});

		describe('suspendRun', () => {
			it('moves run from active to suspended', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				const suspendedState = createSuspendedRunState({ threadId: 'thread-1' });

				registry.suspendRun('thread-1', suspendedState);

				expect(registry.hasActiveRun('thread-1')).toBe(false);
				expect(registry.hasSuspendedRun('thread-1')).toBe(true);
				expect(registry.getSuspendedRun('thread-1')).toBe(suspendedState);
			});
		});

		describe('activateSuspendedRun', () => {
			it('moves run from suspended to active and returns suspended state', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				const suspendedState = createSuspendedRunState({
					threadId: 'thread-1',
					runId: 'run_suspended',
					messageGroupId: 'mg_suspended',
				});
				registry.suspendRun('thread-1', suspendedState);

				const result = registry.activateSuspendedRun('thread-1');

				expect(result).toBe(suspendedState);
				expect(registry.hasSuspendedRun('thread-1')).toBe(false);
				expect(registry.hasActiveRun('thread-1')).toBe(true);

				const activeRun = registry.getActiveRun('thread-1');
				expect(activeRun!.runId).toBe('run_suspended');
				expect(activeRun!.messageGroupId).toBe('mg_suspended');
			});

			it('copies tracing from the suspended state into the active run', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				const tracing = {
					projectName: 'test',
				} as unknown as InstanceAiTraceContext;
				const suspendedState = createSuspendedRunState({
					threadId: 'thread-1',
					tracing,
				});
				registry.suspendRun('thread-1', suspendedState);

				registry.activateSuspendedRun('thread-1');

				const activeRun = registry.getActiveRun('thread-1');
				expect(activeRun!.tracing).toBe(tracing);
			});

			it('returns undefined when no suspended run exists', () => {
				const result = registry.activateSuspendedRun('nonexistent');

				expect(result).toBeUndefined();
			});
		});

		describe('findSuspendedByRequestId', () => {
			it('finds a suspended run by its requestId', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				const suspendedState = createSuspendedRunState({
					threadId: 'thread-1',
					requestId: 'req-123',
				});
				registry.suspendRun('thread-1', suspendedState);

				const result = registry.findSuspendedByRequestId('req-123');

				expect(result).toBe(suspendedState);
			});

			it('searches across multiple suspended runs', () => {
				registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
				registry.suspendRun(
					'thread-1',
					createSuspendedRunState({ threadId: 'thread-1', requestId: 'req-1' }),
				);

				registry.startRun({ threadId: 'thread-2', user: { id: 'u2', name: 'B' } });
				const target = createSuspendedRunState({ threadId: 'thread-2', requestId: 'req-2' });
				registry.suspendRun('thread-2', target);

				expect(registry.findSuspendedByRequestId('req-2')).toBe(target);
			});

			it('returns undefined when no match', () => {
				expect(registry.findSuspendedByRequestId('nonexistent')).toBeUndefined();
			});
		});
	});

	// ── Confirmation flow ─────────────────────────────────────────────────────

	describe('confirmation flow', () => {
		describe('registerPendingConfirmation + resolvePendingConfirmation', () => {
			it('resolves pending confirmation with matching userId', () => {
				const resolve = jest.fn();
				const pending: PendingConfirmation = {
					resolve,
					threadId: 'thread-1',
					userId: 'user-1',
					createdAt: Date.now(),
				};

				registry.registerPendingConfirmation('req-1', pending);

				const data: ConfirmationData = { approved: true, credentialId: 'cred-1' };
				const result = registry.resolvePendingConfirmation('user-1', 'req-1', data);

				expect(result).toBe(true);
				expect(resolve).toHaveBeenCalledWith(data);
			});

			it('removes the confirmation after resolving', () => {
				const resolve = jest.fn();
				const pending: PendingConfirmation = {
					resolve,
					threadId: 'thread-1',
					userId: 'user-1',
					createdAt: Date.now(),
				};

				registry.registerPendingConfirmation('req-1', pending);
				registry.resolvePendingConfirmation('user-1', 'req-1', { approved: true });

				// Second resolve should fail - confirmation already consumed
				const secondResult = registry.resolvePendingConfirmation('user-1', 'req-1', {
					approved: true,
				});
				expect(secondResult).toBe(false);
			});
		});

		it('returns false when userId does not match', () => {
			const resolve = jest.fn();
			const pending: PendingConfirmation = {
				resolve,
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			};

			registry.registerPendingConfirmation('req-1', pending);

			const result = registry.resolvePendingConfirmation('wrong-user', 'req-1', {
				approved: true,
			});

			expect(result).toBe(false);
			expect(resolve).not.toHaveBeenCalled();
		});

		it('returns false when requestId is unknown', () => {
			const result = registry.resolvePendingConfirmation('user-1', 'unknown', {
				approved: true,
			});

			expect(result).toBe(false);
		});

		describe('rejectPendingConfirmation', () => {
			it('auto-rejects with { approved: false }', () => {
				const resolve = jest.fn();
				const pending: PendingConfirmation = {
					resolve,
					threadId: 'thread-1',
					userId: 'user-1',
					createdAt: Date.now(),
				};

				registry.registerPendingConfirmation('req-1', pending);

				const result = registry.rejectPendingConfirmation('req-1');

				expect(result).toBe(true);
				expect(resolve).toHaveBeenCalledWith({ approved: false });
			});

			it('removes the confirmation after rejecting', () => {
				const resolve = jest.fn();
				registry.registerPendingConfirmation('req-1', {
					resolve,
					threadId: 'thread-1',
					userId: 'user-1',
					createdAt: Date.now(),
				});

				registry.rejectPendingConfirmation('req-1');

				// Second reject should return false
				expect(registry.rejectPendingConfirmation('req-1')).toBe(false);
			});

			it('returns false for unknown requestId', () => {
				expect(registry.rejectPendingConfirmation('unknown')).toBe(false);
			});
		});
	});

	// ── Cancellation ──────────────────────────────────────────────────────────

	describe('cancelThread', () => {
		it('resolves pending confirmations for the thread and returns active/suspended runs', () => {
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			const suspendedState = createSuspendedRunState({ threadId: 'thread-1' });
			registry.suspendRun('thread-1', suspendedState);

			// Re-add an active run (to test both active and suspended)
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

			const resolve = jest.fn();
			registry.registerPendingConfirmation('req-1', {
				resolve,
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			});

			const result = registry.cancelThread('thread-1');

			expect(resolve).toHaveBeenCalledWith({ approved: false });
			expect(result.active).toBeDefined();
			expect(result.suspended).toBeDefined();
		});

		it('uses custom cancellation data when provided', () => {
			const resolve = jest.fn();
			registry.registerPendingConfirmation('req-1', {
				resolve,
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			});

			const customData: ConfirmationData = { approved: false, userInput: 'cancelled by user' };
			registry.cancelThread('thread-1', customData);

			expect(resolve).toHaveBeenCalledWith(customData);
		});

		it('removes suspended run from the registry', () => {
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			registry.suspendRun('thread-1', createSuspendedRunState({ threadId: 'thread-1' }));

			registry.cancelThread('thread-1');

			expect(registry.hasSuspendedRun('thread-1')).toBe(false);
		});

		it('returns empty object when no runs exist for the thread', () => {
			const result = registry.cancelThread('nonexistent');

			expect(result.active).toBeUndefined();
			expect(result.suspended).toBeUndefined();
		});

		it('only resolves confirmations belonging to the target thread', () => {
			const resolveThread1 = jest.fn();
			const resolveThread2 = jest.fn();

			registry.registerPendingConfirmation('req-1', {
				resolve: resolveThread1,
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			});
			registry.registerPendingConfirmation('req-2', {
				resolve: resolveThread2,
				threadId: 'thread-2',
				userId: 'user-2',
				createdAt: Date.now(),
			});

			registry.cancelThread('thread-1');

			expect(resolveThread1).toHaveBeenCalledWith({ approved: false });
			expect(resolveThread2).not.toHaveBeenCalled();
		});
	});

	// ── Cleanup ───────────────────────────────────────────────────────────────

	describe('clearThread', () => {
		it('removes all per-thread state', () => {
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'u1', name: 'Alice' },
				researchMode: true,
			});

			const resolve = jest.fn();
			registry.registerPendingConfirmation('req-1', {
				resolve,
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			});

			const result = registry.clearThread('thread-1');

			// Confirmations resolved
			expect(resolve).toHaveBeenCalledWith({ approved: false });

			// Active run returned and deleted
			expect(result.active).toBeDefined();
			expect(registry.hasActiveRun('thread-1')).toBe(false);

			// User and research mode deleted
			expect(registry.getThreadUser('thread-1')).toBeUndefined();
			expect(registry.getThreadResearchMode('thread-1')).toBeUndefined();

			// Message group mappings deleted
			expect(registry.getMessageGroupId('thread-1')).toBeUndefined();
			expect(registry.getRunIdsForMessageGroup('mg_id-2')).toEqual([]);
		});

		it('clears both active and suspended runs', () => {
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			registry.suspendRun('thread-1', createSuspendedRunState({ threadId: 'thread-1' }));
			// Re-add active
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });

			const result = registry.clearThread('thread-1');

			expect(result.active).toBeDefined();
			expect(result.suspended).toBeDefined();
			expect(registry.hasActiveRun('thread-1')).toBe(false);
			expect(registry.hasSuspendedRun('thread-1')).toBe(false);
		});

		it('returns empty when thread has no state', () => {
			const result = registry.clearThread('nonexistent');

			expect(result.active).toBeUndefined();
			expect(result.suspended).toBeUndefined();
		});
	});

	describe('shutdown', () => {
		it('clears everything and returns all active and suspended runs', () => {
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			registry.startRun({ threadId: 'thread-2', user: { id: 'u2', name: 'B' } });
			registry.suspendRun(
				'thread-2',
				createSuspendedRunState({ threadId: 'thread-2', runId: 'run_suspended' }),
			);

			const result = registry.shutdown();

			expect(result.activeRuns).toHaveLength(1);
			expect(result.activeRuns[0].runId).toBe('run_id-1');
			expect(result.suspendedRuns).toHaveLength(1);
			expect(result.suspendedRuns[0].runId).toBe('run_suspended');
		});

		it('resolves all pending confirmations', () => {
			const resolve1 = jest.fn();
			const resolve2 = jest.fn();

			registry.registerPendingConfirmation('req-1', {
				resolve: resolve1,
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			});
			registry.registerPendingConfirmation('req-2', {
				resolve: resolve2,
				threadId: 'thread-2',
				userId: 'user-2',
				createdAt: Date.now(),
			});

			registry.shutdown();

			expect(resolve1).toHaveBeenCalledWith({ approved: false });
			expect(resolve2).toHaveBeenCalledWith({ approved: false });
		});

		it('uses custom cancellation data when provided', () => {
			const resolve = jest.fn();
			registry.registerPendingConfirmation('req-1', {
				resolve,
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			});

			const customData: ConfirmationData = { approved: false, userInput: 'shutdown' };
			registry.shutdown(customData);

			expect(resolve).toHaveBeenCalledWith(customData);
		});

		it('leaves registry fully empty after shutdown', () => {
			registry.startRun({
				threadId: 'thread-1',
				user: { id: 'u1', name: 'A' },
				researchMode: true,
			});
			registry.registerPendingConfirmation('req-1', {
				resolve: jest.fn(),
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: Date.now(),
			});

			registry.shutdown();

			expect(registry.hasActiveRun('thread-1')).toBe(false);
			expect(registry.hasSuspendedRun('thread-1')).toBe(false);
			expect(registry.getThreadUser('thread-1')).toBeUndefined();
			expect(registry.getThreadResearchMode('thread-1')).toBeUndefined();
			expect(registry.getMessageGroupId('thread-1')).toBeUndefined();
			expect(registry.getRunIdsForMessageGroup('mg_id-2')).toEqual([]);
		});
	});

	// ── sweepTimedOut ─────────────────────────────────────────────────────────

	describe('sweepTimedOut', () => {
		it('identifies suspended runs older than maxAgeMs', () => {
			const now = Date.now();
			registry.startRun({ threadId: 'thread-old', user: { id: 'u1', name: 'A' } });
			registry.suspendRun(
				'thread-old',
				createSuspendedRunState({ threadId: 'thread-old', createdAt: now - 60_000 }),
			);

			registry.startRun({ threadId: 'thread-new', user: { id: 'u2', name: 'B' } });
			registry.suspendRun(
				'thread-new',
				createSuspendedRunState({ threadId: 'thread-new', createdAt: now - 10_000 }),
			);

			const result = registry.sweepTimedOut(30_000);

			expect(result.suspendedThreadIds).toEqual(['thread-old']);
		});

		it('identifies pending confirmations older than maxAgeMs', () => {
			const now = Date.now();

			registry.registerPendingConfirmation('req-old', {
				resolve: jest.fn(),
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: now - 60_000,
			});

			registry.registerPendingConfirmation('req-new', {
				resolve: jest.fn(),
				threadId: 'thread-2',
				userId: 'user-2',
				createdAt: now - 10_000,
			});

			const result = registry.sweepTimedOut(30_000);

			expect(result.confirmationRequestIds).toEqual(['req-old']);
		});

		it('does NOT mutate state', () => {
			const now = Date.now();
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			registry.suspendRun(
				'thread-1',
				createSuspendedRunState({ threadId: 'thread-1', createdAt: now - 60_000 }),
			);

			registry.registerPendingConfirmation('req-1', {
				resolve: jest.fn(),
				threadId: 'thread-1',
				userId: 'user-1',
				createdAt: now - 60_000,
			});

			registry.sweepTimedOut(30_000);

			// State should still be intact
			expect(registry.hasSuspendedRun('thread-1')).toBe(true);
			// The confirmation should still be resolvable
			expect(registry.rejectPendingConfirmation('req-1')).toBe(true);
		});

		it('returns empty arrays when nothing is timed out', () => {
			const now = Date.now();
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			registry.suspendRun(
				'thread-1',
				createSuspendedRunState({ threadId: 'thread-1', createdAt: now }),
			);

			const result = registry.sweepTimedOut(30_000);

			expect(result.suspendedThreadIds).toEqual([]);
			expect(result.confirmationRequestIds).toEqual([]);
		});

		it('includes items exactly at the maxAge boundary', () => {
			const now = Date.now();
			registry.startRun({ threadId: 'thread-1', user: { id: 'u1', name: 'A' } });
			registry.suspendRun(
				'thread-1',
				createSuspendedRunState({ threadId: 'thread-1', createdAt: now - 30_000 }),
			);

			const result = registry.sweepTimedOut(30_000);

			// now - createdAt === maxAgeMs, so >= matches
			expect(result.suspendedThreadIds).toEqual(['thread-1']);
		});
	});
});
