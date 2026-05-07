import type { PlannedTaskStorage } from '../../storage/planned-task-storage';
import type { PlannedTask, PlannedTaskGraph, PlannedTaskRecord } from '../../types';
import { PlannedTaskCoordinator } from '../planned-task-service';

function makeStorage(): jest.Mocked<PlannedTaskStorage> {
	return {
		get: jest.fn(),
		save: jest.fn(),
		update: jest.fn(),
		clear: jest.fn(),
	} as unknown as jest.Mocked<PlannedTaskStorage>;
}

function makeTask(overrides: Partial<PlannedTask> = {}): PlannedTask {
	return {
		id: 'task-1',
		title: 'Test task',
		kind: 'build-workflow',
		deps: [],
		spec: 'Build a workflow',
		...overrides,
	};
}

function makeGraph(overrides: Partial<PlannedTaskGraph> = {}): PlannedTaskGraph {
	return {
		planRunId: 'run-1',
		status: 'active',
		tasks: [],
		...overrides,
	};
}

function makeTaskRecord(overrides: Partial<PlannedTaskRecord> = {}): PlannedTaskRecord {
	return {
		id: 'task-1',
		title: 'Test task',
		kind: 'build-workflow',
		deps: [],
		spec: 'Build a workflow',
		status: 'planned',
		...overrides,
	};
}

describe('PlannedTaskCoordinator', () => {
	let storage: jest.Mocked<PlannedTaskStorage>;
	let coordinator: PlannedTaskCoordinator;

	beforeEach(() => {
		jest.clearAllMocks();
		storage = makeStorage();
		coordinator = new PlannedTaskCoordinator(storage);
	});

	describe('createPlan', () => {
		it('saves a valid plan in awaiting_approval status and returns graph', async () => {
			const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b', deps: ['a'] })];

			const result = await coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' });

			expect(storage.save).toHaveBeenCalledWith(
				'thread-1',
				expect.objectContaining({
					planRunId: 'run-1',
					status: 'awaiting_approval',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					tasks: expect.arrayContaining([
						expect.objectContaining({ id: 'a', status: 'planned' }),
						expect.objectContaining({ id: 'b', status: 'planned' }),
					]),
				}),
			);
			expect(result.status).toBe('awaiting_approval');
			expect(result.tasks).toHaveLength(2);
		});

		it('throws on duplicate task IDs', async () => {
			const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'a' })];

			await expect(
				coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' }),
			).rejects.toThrow('duplicate task IDs');
		});

		it('throws on unknown dependency', async () => {
			const tasks = [makeTask({ id: 'a', deps: ['unknown'] })];

			await expect(
				coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' }),
			).rejects.toThrow('depends on unknown task');
		});

		it('throws on dependency cycle', async () => {
			const tasks = [makeTask({ id: 'a', deps: ['b'] }), makeTask({ id: 'b', deps: ['a'] })];

			await expect(
				coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' }),
			).rejects.toThrow('dependency cycle');
		});

		it('throws when delegate task has no tools', async () => {
			const tasks = [makeTask({ id: 'a', kind: 'delegate', tools: [] })];

			await expect(
				coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' }),
			).rejects.toThrow('must include at least one tool');
		});

		it('accepts a checkpoint task that depends on a build-workflow task', async () => {
			const tasks = [
				makeTask({ id: 'wf-1' }),
				makeTask({ id: 'verify-1', kind: 'checkpoint', deps: ['wf-1'] }),
			];

			const result = await coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' });

			expect(result.tasks).toHaveLength(2);
		});

		it('throws when a checkpoint task has no deps', async () => {
			const tasks = [makeTask({ id: 'verify-1', kind: 'checkpoint', deps: [] })];

			await expect(
				coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' }),
			).rejects.toThrow('must depend on at least one build-workflow task');
		});

		it('throws when a checkpoint task depends only on non-build-workflow tasks', async () => {
			const tasks = [
				makeTask({ id: 'dt-1', kind: 'manage-data-tables' }),
				makeTask({ id: 'verify-1', kind: 'checkpoint', deps: ['dt-1'] }),
			];

			await expect(
				coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' }),
			).rejects.toThrow('must depend on at least one build-workflow task');
		});
	});

	describe('getGraph', () => {
		it('delegates to storage.get', async () => {
			const graph = makeGraph();
			storage.get.mockResolvedValue(graph);

			const result = await coordinator.getGraph('thread-1');

			expect(result).toBe(graph);
			expect(storage.get).toHaveBeenCalledWith('thread-1');
		});
	});

	describe('markRunning', () => {
		it('updates task status to running via storage.update', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'task-1', status: 'planned' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markRunning('thread-1', 'task-1', {
				agentId: 'agent-1',
			});

			expect(result?.tasks[0].status).toBe('running');
			expect(result?.tasks[0].agentId).toBe('agent-1');
		});
	});

	describe('markSucceeded', () => {
		it('updates task status to succeeded', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'task-1', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markSucceeded('thread-1', 'task-1', {
				result: 'Built wf-1',
			});

			expect(result?.tasks[0].status).toBe('succeeded');
			expect(result?.tasks[0].result).toBe('Built wf-1');
		});
	});

	describe('markFailed', () => {
		it('updates task status to failed with error', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'task-1', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'task-1', {
				error: 'Build failed',
			});

			expect(result?.tasks[0].status).toBe('failed');
			expect(result?.tasks[0].error).toBe('Build failed');
		});

		it('cancels direct dependents with a dependency-name reason', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'a', {
				error: 'Build failed',
			});

			const a = result?.tasks.find((t) => t.id === 'a');
			const b = result?.tasks.find((t) => t.id === 'b');
			expect(a?.status).toBe('failed');
			expect(a?.error).toBe('Build failed');
			expect(b?.status).toBe('cancelled');
			expect(b?.error).toBe('Cancelled: dependency "a" failed');
		});

		it('cancels transitive dependents', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'planned' }),
						makeTaskRecord({ id: 'c', deps: ['b'], status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'a', {});

			expect(result?.tasks.find((t) => t.id === 'a')?.status).toBe('failed');
			expect(result?.tasks.find((t) => t.id === 'b')?.status).toBe('cancelled');
			expect(result?.tasks.find((t) => t.id === 'c')?.status).toBe('cancelled');
		});

		it('cancels dependents in a diamond graph', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'planned' }),
						makeTaskRecord({ id: 'c', deps: ['a'], status: 'planned' }),
						makeTaskRecord({ id: 'd', deps: ['b', 'c'], status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'a', {});

			expect(result?.tasks.find((t) => t.id === 'a')?.status).toBe('failed');
			expect(result?.tasks.find((t) => t.id === 'b')?.status).toBe('cancelled');
			expect(result?.tasks.find((t) => t.id === 'c')?.status).toBe('cancelled');
			expect(result?.tasks.find((t) => t.id === 'd')?.status).toBe('cancelled');
		});

		it('leaves independent tasks untouched', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'planned' }),
						makeTaskRecord({ id: 'c', deps: [], status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'a', {});

			expect(result?.tasks.find((t) => t.id === 'c')?.status).toBe('planned');
			expect(result?.tasks.find((t) => t.id === 'c')?.error).toBeUndefined();
		});

		it('preserves already-terminal dependents', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'succeeded' }),
						makeTaskRecord({ id: 'c', deps: ['a'], status: 'failed', error: 'earlier fail' }),
						makeTaskRecord({
							id: 'd',
							deps: ['a'],
							status: 'cancelled',
							error: 'user aborted',
						}),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'a', {});

			expect(result?.tasks.find((t) => t.id === 'b')?.status).toBe('succeeded');
			expect(result?.tasks.find((t) => t.id === 'c')?.status).toBe('failed');
			expect(result?.tasks.find((t) => t.id === 'c')?.error).toBe('earlier fail');
			expect(result?.tasks.find((t) => t.id === 'd')?.status).toBe('cancelled');
			expect(result?.tasks.find((t) => t.id === 'd')?.error).toBe('user aborted');
		});

		it('is a no-op when the failed task id is not in the graph', async () => {
			const graph = makeGraph({
				tasks: [makeTaskRecord({ id: 'a', status: 'running' })],
			});
			storage.update.mockImplementation(async (_threadId, updater) => {
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'nonexistent', {});

			expect(result?.tasks.find((t) => t.id === 'a')?.status).toBe('running');
		});

		it('propagates the same finishedAt to the failed task and cancelled dependents', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'a', {
				finishedAt: 1_700_000_000_000,
			});

			expect(result?.tasks.find((t) => t.id === 'a')?.finishedAt).toBe(1_700_000_000_000);
			expect(result?.tasks.find((t) => t.id === 'b')?.finishedAt).toBe(1_700_000_000_000);
		});

		it('cancels a running dependent defensively even though the scheduler guard should prevent this', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'running' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markFailed('thread-1', 'a', {});

			expect(result?.tasks.find((t) => t.id === 'b')?.status).toBe('cancelled');
			expect(result?.tasks.find((t) => t.id === 'b')?.error).toBe(
				'Cancelled: dependency "a" failed',
			);
		});
	});

	describe('markCancelled', () => {
		it('updates task status to cancelled', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'task-1', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.markCancelled('thread-1', 'task-1');

			expect(result?.tasks[0].status).toBe('cancelled');
		});
	});

	describe('markCheckpointSucceeded', () => {
		it('transitions a running checkpoint to succeeded', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'verify-1', kind: 'checkpoint', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointSucceeded('thread-1', 'verify-1', {
				result: 'Verified',
			});

			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.graph.tasks[0].status).toBe('succeeded');
				expect(res.graph.tasks[0].result).toBe('Verified');
			}
		});

		it('rejects when the target task is not found', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({ tasks: [] });
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointSucceeded('thread-1', 'missing', {});

			expect(res).toEqual({ ok: false, reason: 'not-found' });
		});

		it('rejects when the target task is not a checkpoint', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'task-1', kind: 'build-workflow', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointSucceeded('thread-1', 'task-1', {});

			expect(res).toEqual({
				ok: false,
				reason: 'wrong-kind',
				actual: { kind: 'build-workflow' },
			});
		});

		it('rejects when the checkpoint is not in running state', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'verify-1', kind: 'checkpoint', status: 'planned' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointSucceeded('thread-1', 'verify-1', {});

			expect(res).toEqual({
				ok: false,
				reason: 'wrong-status',
				actual: { status: 'planned' },
			});
		});
	});

	describe('markCheckpointFailed', () => {
		it('transitions a running checkpoint to failed with error', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'verify-1', kind: 'checkpoint', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointFailed('thread-1', 'verify-1', {
				error: 'Workflow errored',
			});

			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.graph.tasks[0].status).toBe('failed');
				expect(res.graph.tasks[0].error).toBe('Workflow errored');
			}
		});

		it('cancels dependent tasks on failure', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'verify-1', kind: 'checkpoint', status: 'running' }),
						makeTaskRecord({
							id: 'wf-2',
							kind: 'build-workflow',
							status: 'planned',
							deps: ['verify-1'],
						}),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointFailed('thread-1', 'verify-1', {
				error: 'boom',
			});

			expect(res.ok).toBe(true);
			if (res.ok) {
				const wf2 = res.graph.tasks.find((t) => t.id === 'wf-2');
				expect(wf2?.status).toBe('cancelled');
			}
		});

		it('rejects when the target task is not a checkpoint', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'task-1', kind: 'build-workflow', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointFailed('thread-1', 'task-1', {});

			expect(res).toEqual({
				ok: false,
				reason: 'wrong-kind',
				actual: { kind: 'build-workflow' },
			});
		});

		it('persists the structured outcome on the failed checkpoint so replans keep execution context', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'verify-1', kind: 'checkpoint', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.markCheckpointFailed('thread-1', 'verify-1', {
				error: 'Node crashed',
				outcome: {
					executionId: 'exec-42',
					failureNode: 'Insert Row',
					errorMessage: 'constraint violation',
				},
			});

			expect(res.ok).toBe(true);
			if (res.ok) {
				const failed = res.graph.tasks.find((t) => t.id === 'verify-1');
				expect(failed?.status).toBe('failed');
				expect(failed?.outcome).toEqual({
					executionId: 'exec-42',
					failureNode: 'Insert Row',
					errorMessage: 'constraint violation',
				});
			}
		});
	});

	describe('revertCheckpointToPlanned', () => {
		it('rewinds a running checkpoint to planned without touching dependents', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({
							id: 'verify-1',
							kind: 'checkpoint',
							status: 'running',
							agentId: 'agent-race',
							startedAt: 123,
						}),
						makeTaskRecord({
							id: 'wf-2',
							kind: 'build-workflow',
							status: 'planned',
							deps: ['verify-1'],
						}),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.revertCheckpointToPlanned('thread-1', 'verify-1');

			expect(res.ok).toBe(true);
			if (res.ok) {
				const verify = res.graph.tasks.find((t) => t.id === 'verify-1');
				expect(verify?.status).toBe('planned');
				expect(verify?.agentId).toBeUndefined();
				expect(verify?.startedAt).toBeUndefined();
				// Dependents must remain untouched — scheduling race is not a failure.
				const wf2 = res.graph.tasks.find((t) => t.id === 'wf-2');
				expect(wf2?.status).toBe('planned');
				expect(wf2?.error).toBeUndefined();
			}
		});

		it('rejects when the target task is not a checkpoint', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'task-1', kind: 'build-workflow', status: 'running' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.revertCheckpointToPlanned('thread-1', 'task-1');

			expect(res).toEqual({
				ok: false,
				reason: 'wrong-kind',
				actual: { kind: 'build-workflow' },
			});
		});

		it('rejects when the checkpoint is not running', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'verify-1', kind: 'checkpoint', status: 'planned' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const res = await coordinator.revertCheckpointToPlanned('thread-1', 'verify-1');

			expect(res).toEqual({
				ok: false,
				reason: 'wrong-status',
				actual: { status: 'planned' },
			});
		});
	});

	describe('tick', () => {
		it('dispatches ready tasks with all deps satisfied', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', deps: [], status: 'succeeded' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'planned' }),
						makeTaskRecord({ id: 'c', deps: ['a'], status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');

			expect(action.type).toBe('dispatch');
			if (action.type === 'dispatch') {
				expect(action.tasks).toHaveLength(2);
				expect(action.tasks.map((t) => t.id)).toEqual(['b', 'c']);
			}
		});

		it('returns none when no tasks are ready', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', deps: [], status: 'running' }),
						makeTaskRecord({ id: 'b', deps: ['a'], status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');
			expect(action.type).toBe('none');
		});

		it('returns orchestrate-checkpoint when a checkpoint is ready', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'wf-1', kind: 'build-workflow', status: 'succeeded' }),
						makeTaskRecord({
							id: 'verify-1',
							kind: 'checkpoint',
							deps: ['wf-1'],
							status: 'planned',
						}),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');

			expect(action.type).toBe('orchestrate-checkpoint');
			if (action.type === 'orchestrate-checkpoint') {
				expect(action.tasks).toHaveLength(1);
				expect(action.tasks[0].id).toBe('verify-1');
			}
		});

		it('emits a single checkpoint even when multiple are ready', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'wf-1', kind: 'build-workflow', status: 'succeeded' }),
						makeTaskRecord({ id: 'wf-2', kind: 'build-workflow', status: 'succeeded' }),
						makeTaskRecord({
							id: 'verify-1',
							kind: 'checkpoint',
							deps: ['wf-1'],
							status: 'planned',
						}),
						makeTaskRecord({
							id: 'verify-2',
							kind: 'checkpoint',
							deps: ['wf-2'],
							status: 'planned',
						}),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');

			expect(action.type).toBe('orchestrate-checkpoint');
			if (action.type === 'orchestrate-checkpoint') {
				expect(action.tasks).toHaveLength(1);
			}
		});

		it('prefers an orchestrate-checkpoint over a background dispatch', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'wf-1', kind: 'build-workflow', status: 'succeeded' }),
						makeTaskRecord({
							id: 'verify-1',
							kind: 'checkpoint',
							deps: ['wf-1'],
							status: 'planned',
						}),
						makeTaskRecord({
							id: 'wf-2',
							kind: 'build-workflow',
							deps: [],
							status: 'planned',
						}),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');

			expect(action.type).toBe('orchestrate-checkpoint');
			if (action.type === 'orchestrate-checkpoint') {
				expect(action.tasks[0].id).toBe('verify-1');
			}
		});

		it('triggers replan when a task has failed', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [makeTaskRecord({ id: 'a', status: 'failed', error: 'boom' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');

			expect(action.type).toBe('replan');
			if (action.type === 'replan') {
				expect(action.failedTask.id).toBe('a');
				expect(action.graph?.status).toBe('awaiting_replan');
			}
		});

		it('synthesizes when all tasks succeeded', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'succeeded' }),
						makeTaskRecord({ id: 'b', status: 'succeeded' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');

			expect(action.type).toBe('synthesize');
			if (action.type === 'synthesize') {
				expect(action.graph?.status).toBe('completed');
			}
		});

		it('respects availableSlots limit', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					tasks: [
						makeTaskRecord({ id: 'a', status: 'planned' }),
						makeTaskRecord({ id: 'b', status: 'planned' }),
						makeTaskRecord({ id: 'c', status: 'planned' }),
					],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1', { availableSlots: 1 });

			expect(action.type).toBe('dispatch');
			if (action.type === 'dispatch') {
				expect(action.tasks).toHaveLength(1);
			}
		});

		it('returns none when graph is not active', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({ status: 'completed' });
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');
			expect(action.type).toBe('none');
		});

		it('returns none when no graph exists', async () => {
			storage.update.mockResolvedValue(null);

			const action = await coordinator.tick('thread-1');
			expect(action.type).toBe('none');
			expect(action.graph).toBeNull();
		});
	});

	describe('clear', () => {
		it('delegates to storage.clear', async () => {
			await coordinator.clear('thread-1');
			expect(storage.clear).toHaveBeenCalledWith('thread-1');
		});
	});

	describe('approvePlan', () => {
		it('transitions awaiting_approval → active', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({ status: 'awaiting_approval' });
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.approvePlan('thread-1');

			expect(result?.status).toBe('active');
		});

		it('leaves an active graph untouched', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({ status: 'active' });
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.approvePlan('thread-1');

			expect(result?.status).toBe('active');
		});

		it('does not resurrect a cancelled graph', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({ status: 'cancelled' });
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.approvePlan('thread-1');

			expect(result?.status).toBe('cancelled');
		});
	});

	describe('tick on awaiting_approval graphs', () => {
		it('returns none (never dispatches) when graph is awaiting_approval', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					status: 'awaiting_approval',
					tasks: [makeTaskRecord({ id: 'a', status: 'planned' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const action = await coordinator.tick('thread-1');

			expect(action.type).toBe('none');
		});
	});

	describe('revertToActive', () => {
		it('flips an awaiting_replan graph back to active', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					status: 'awaiting_replan',
					tasks: [makeTaskRecord({ id: 'a', status: 'failed', error: 'boom' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.revertToActive('thread-1');

			expect(result?.status).toBe('active');
		});

		it('flips a completed graph back to active', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({
					status: 'completed',
					tasks: [makeTaskRecord({ id: 'a', status: 'succeeded' })],
				});
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.revertToActive('thread-1');

			expect(result?.status).toBe('active');
		});

		it('leaves a cancelled graph untouched', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({ status: 'cancelled' });
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.revertToActive('thread-1');

			expect(result?.status).toBe('cancelled');
		});

		it('leaves an active graph untouched', async () => {
			storage.update.mockImplementation(async (_threadId, updater) => {
				const graph = makeGraph({ status: 'active' });
				return await Promise.resolve(updater(graph));
			});

			const result = await coordinator.revertToActive('thread-1');

			expect(result?.status).toBe('active');
		});
	});
});
