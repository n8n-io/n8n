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

function collectDependents(graph: PlannedTaskGraph, rootId: string): Set<string> {
	const dependents = new Set<string>();
	const queue = [rootId];

	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const task of graph.tasks) {
			if (task.deps.includes(current) && !dependents.has(task.id)) {
				dependents.add(task.id);
				queue.push(task.id);
			}
		}
	}

	return dependents;
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
		return await this.storage.update(threadId, (graph) =>
			updateTaskRecord(graph, taskId, (task) => ({
				...task,
				status: 'running',
				agentId: update.agentId ?? task.agentId,
				backgroundTaskId: update.backgroundTaskId ?? task.backgroundTaskId,
				startedAt: update.startedAt ?? task.startedAt ?? Date.now(),
				error: undefined,
			})),
		);
	}

	async markSucceeded(
		threadId: string,
		taskId: string,
		update: { result?: string; outcome?: Record<string, unknown>; finishedAt?: number },
	): Promise<PlannedTaskGraph | null> {
		return await this.storage.update(threadId, (graph) =>
			updateTaskRecord(graph, taskId, (task) => ({
				...task,
				status: 'succeeded',
				result: update.result ?? task.result,
				outcome: update.outcome ?? task.outcome,
				finishedAt: update.finishedAt ?? Date.now(),
				error: undefined,
			})),
		);
	}

	async markFailed(
		threadId: string,
		taskId: string,
		update: { error?: string; finishedAt?: number },
	): Promise<PlannedTaskGraph | null> {
		return await this.storage.update(threadId, (graph) => {
			const failedTask = graph.tasks.find((task) => task.id === taskId);
			if (!failedTask) return graph;

			const dependents = collectDependents(graph, taskId);
			const finishedAt = update.finishedAt ?? Date.now();
			const failureError = update.error ?? failedTask.error ?? 'Unknown error';

			const tasks = graph.tasks.map<PlannedTaskRecord>((task) => {
				if (task.id === taskId) {
					return {
						...task,
						status: 'failed',
						error: failureError,
						finishedAt,
					};
				}
				if (dependents.has(task.id) && (task.status === 'planned' || task.status === 'running')) {
					return {
						...task,
						status: 'cancelled',
						error: `Cancelled: dependency "${taskId}" failed`,
						finishedAt,
					};
				}
				return task;
			});

			return { ...graph, tasks };
		});
	}

	async markCancelled(
		threadId: string,
		taskId: string,
		update?: { error?: string; finishedAt?: number },
	): Promise<PlannedTaskGraph | null> {
		return await this.storage.update(threadId, (graph) =>
			updateTaskRecord(graph, taskId, (task) => ({
				...task,
				status: 'cancelled',
				error: update?.error ?? task.error,
				finishedAt: update?.finishedAt ?? Date.now(),
			})),
		);
	}

	async tick(
		threadId: string,
		options: { availableSlots?: number } = {},
	): Promise<PlannedTaskSchedulerAction> {
		// Use atomic update so the graph status transition (active → awaiting_replan
		// or active → completed) cannot race with concurrent markSucceeded/markFailed.
		let action: PlannedTaskSchedulerAction = { type: 'none', graph: null };

		await this.storage.update(threadId, (graph) => {
			if (graph.status !== 'active') {
				action = { type: 'none', graph };
				return graph;
			}

			const failedTask = graph.tasks.find((task) => task.status === 'failed');
			if (failedTask) {
				const nextGraph: PlannedTaskGraph = { ...graph, status: 'awaiting_replan' };
				action = { type: 'replan', graph: nextGraph, failedTask };
				return nextGraph;
			}

			if (graph.tasks.length > 0 && graph.tasks.every(isSuccess)) {
				const nextGraph: PlannedTaskGraph = { ...graph, status: 'completed' };
				action = { type: 'synthesize', graph: nextGraph };
				return nextGraph;
			}

			// All tasks settled (succeeded/cancelled mix) but none are planned or running —
			// treat as completed so the orchestrator can synthesize partial results.
			const hasWorkLeft = graph.tasks.some((t) => t.status === 'planned' || t.status === 'running');
			if (graph.tasks.length > 0 && !hasWorkLeft) {
				const nextGraph: PlannedTaskGraph = { ...graph, status: 'completed' };
				action = { type: 'synthesize', graph: nextGraph };
				return nextGraph;
			}

			const availableSlots = options.availableSlots ?? graph.tasks.length;
			if (availableSlots <= 0) {
				action = { type: 'none', graph };
				return graph;
			}

			const successfulIds = new Set(
				graph.tasks.filter((task) => task.status === 'succeeded').map((task) => task.id),
			);
			const readyTasks = graph.tasks.filter(
				(task) => task.status === 'planned' && task.deps.every((depId) => successfulIds.has(depId)),
			);

			if (readyTasks.length === 0) {
				action = { type: 'none', graph };
				return graph;
			}

			action = { type: 'dispatch', graph, tasks: readyTasks.slice(0, availableSlots) };
			return graph;
		});

		// If no graph exists, storage.update returns null and the updater never runs
		return action;
	}

	async clear(threadId: string): Promise<void> {
		await this.storage.clear(threadId);
	}
}
