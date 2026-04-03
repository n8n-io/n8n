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
		it('saves a valid plan and returns graph', async () => {
			const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b', deps: ['a'] })];

			const result = await coordinator.createPlan('thread-1', tasks, { planRunId: 'run-1' });

			expect(storage.save).toHaveBeenCalledWith(
				'thread-1',
				expect.objectContaining({
					planRunId: 'run-1',
					status: 'active',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					tasks: expect.arrayContaining([
						expect.objectContaining({ id: 'a', status: 'planned' }),
						expect.objectContaining({ id: 'b', status: 'planned' }),
					]),
				}),
			);
			expect(result.status).toBe('active');
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
});
