import type { PlannedTaskStorage } from '../storage/planned-task-storage';
import type {
	PlannedTask,
	PlannedTaskGraph,
	PlannedTaskRecord,
	PlannedTaskSchedulerAction,
	PlannedTaskService,
} from '../types';

function hasDuplicateIds(tasks: PlannedTask[]): boolean {
	return new Set(tasks.map((task) => task.id)).size !== tasks.length;
}

function validateDependencies(tasks: PlannedTask[]): void {
	if (hasDuplicateIds(tasks)) {
		throw new Error('Plan contains duplicate task IDs');
	}

	const knownIds = new Set(tasks.map((task) => task.id));
	for (const task of tasks) {
		for (const depId of task.deps) {
			if (!knownIds.has(depId)) {
				throw new Error(`Task "${task.id}" depends on unknown task "${depId}"`);
			}
		}
		if (task.kind === 'delegate' && (!task.tools || task.tools.length === 0)) {
			throw new Error(`Delegate task "${task.id}" must include at least one tool`);
		}
	}

	const visiting = new Set<string>();
	const visited = new Set<string>();
	const byId = new Map(tasks.map((task) => [task.id, task]));

	const visit = (taskId: string) => {
		if (visited.has(taskId)) return;
		if (visiting.has(taskId)) {
			throw new Error(`Plan contains a dependency cycle involving "${taskId}"`);
		}

		visiting.add(taskId);
		const task = byId.get(taskId);
		for (const depId of task?.deps ?? []) {
			visit(depId);
		}
		visiting.delete(taskId);
		visited.add(taskId);
	};

	for (const task of tasks) {
		visit(task.id);
	}
}

function isSuccess(task: PlannedTaskRecord): boolean {
	return task.status === 'succeeded';
}

function updateTaskRecord(
	graph: PlannedTaskGraph,
	taskId: string,
	updater: (task: PlannedTaskRecord) => PlannedTaskRecord,
): PlannedTaskGraph | null {
	const index = graph.tasks.findIndex((task) => task.id === taskId);
	if (index < 0) return null;

	const tasks = [...graph.tasks];
	tasks[index] = updater(tasks[index]);
	return { ...graph, tasks };
}

export class PlannedTaskCoordinator implements PlannedTaskService {
	constructor(private readonly storage: PlannedTaskStorage) {}

	async createPlan(
		threadId: string,
		tasks: PlannedTask[],
		metadata: { planRunId: string; messageGroupId?: string },
	): Promise<PlannedTaskGraph> {
		validateDependencies(tasks);

		const graph: PlannedTaskGraph = {
			planRunId: metadata.planRunId,
			messageGroupId: metadata.messageGroupId,
			status: 'active',
			tasks: tasks.map<PlannedTaskRecord>((task) => ({
				...task,
				status: 'planned',
			})),
		};

		await this.storage.save(threadId, graph);
		return graph;
	}

	async getGraph(threadId: string): Promise<PlannedTaskGraph | null> {
		return await this.storage.get(threadId);
	}

	async markRunning(
		threadId: string,
		taskId: string,
		update: { agentId?: string; backgroundTaskId?: string; startedAt?: number },
	): Promise<PlannedTaskGraph | null> {
		const graph = await this.storage.get(threadId);
		if (!graph) return null;

		const updated = updateTaskRecord(graph, taskId, (task) => ({
			...task,
			status: 'running',
			agentId: update.agentId ?? task.agentId,
			backgroundTaskId: update.backgroundTaskId ?? task.backgroundTaskId,
			startedAt: update.startedAt ?? task.startedAt ?? Date.now(),
			error: undefined,
		}));
		if (!updated) return graph;

		await this.storage.save(threadId, updated);
		return updated;
	}

	async markSucceeded(
		threadId: string,
		taskId: string,
		update: { result?: string; outcome?: Record<string, unknown>; finishedAt?: number },
	): Promise<PlannedTaskGraph | null> {
		const graph = await this.storage.get(threadId);
		if (!graph) return null;

		const updated = updateTaskRecord(graph, taskId, (task) => ({
			...task,
			status: 'succeeded',
			result: update.result ?? task.result,
			outcome: update.outcome ?? task.outcome,
			finishedAt: update.finishedAt ?? Date.now(),
			error: undefined,
		}));
		if (!updated) return graph;

		await this.storage.save(threadId, updated);
		return updated;
	}

	async markFailed(
		threadId: string,
		taskId: string,
		update: { error?: string; finishedAt?: number },
	): Promise<PlannedTaskGraph | null> {
		const graph = await this.storage.get(threadId);
		if (!graph) return null;

		const updated = updateTaskRecord(graph, taskId, (task) => ({
			...task,
			status: 'failed',
			error: update.error ?? task.error ?? 'Unknown error',
			finishedAt: update.finishedAt ?? Date.now(),
		}));
		if (!updated) return graph;

		await this.storage.save(threadId, updated);
		return updated;
	}

	async markCancelled(
		threadId: string,
		taskId: string,
		update?: { error?: string; finishedAt?: number },
	): Promise<PlannedTaskGraph | null> {
		const graph = await this.storage.get(threadId);
		if (!graph) return null;

		const updated = updateTaskRecord(graph, taskId, (task) => ({
			...task,
			status: 'cancelled',
			error: update?.error ?? task.error,
			finishedAt: update?.finishedAt ?? Date.now(),
		}));
		if (!updated) return graph;

		await this.storage.save(threadId, updated);
		return updated;
	}

	async tick(
		threadId: string,
		options: { availableSlots?: number } = {},
	): Promise<PlannedTaskSchedulerAction> {
		const graph = await this.storage.get(threadId);
		if (!graph) {
			return { type: 'none', graph: null };
		}

		if (graph.status !== 'active') {
			return { type: 'none', graph };
		}

		const failedTask = graph.tasks.find((task) => task.status === 'failed');
		if (failedTask) {
			const nextGraph: PlannedTaskGraph = { ...graph, status: 'awaiting_replan' };
			await this.storage.save(threadId, nextGraph);
			return { type: 'replan', graph: nextGraph, failedTask };
		}

		if (graph.tasks.length > 0 && graph.tasks.every(isSuccess)) {
			const nextGraph: PlannedTaskGraph = { ...graph, status: 'completed' };
			await this.storage.save(threadId, nextGraph);
			return { type: 'synthesize', graph: nextGraph };
		}

		const availableSlots = options.availableSlots ?? graph.tasks.length;
		if (availableSlots <= 0) {
			return { type: 'none', graph };
		}

		const successfulIds = new Set(
			graph.tasks.filter((task) => task.status === 'succeeded').map((task) => task.id),
		);
		const readyTasks = graph.tasks.filter(
			(task) => task.status === 'planned' && task.deps.every((depId) => successfulIds.has(depId)),
		);

		if (readyTasks.length === 0) {
			return { type: 'none', graph };
		}

		return {
			type: 'dispatch',
			graph,
			tasks: readyTasks.slice(0, availableSlots),
		};
	}

	async clear(threadId: string): Promise<void> {
		await this.storage.clear(threadId);
	}
}
