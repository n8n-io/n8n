import type { PlannedTaskStorage } from '../storage/planned-task-storage';
import type {
	CheckpointSettleResult,
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
	const byId = new Map(tasks.map((task) => [task.id, task]));
	for (const task of tasks) {
		for (const depId of task.deps) {
			if (!knownIds.has(depId)) {
				throw new Error(`Task "${task.id}" depends on unknown task "${depId}"`);
			}
		}
		if (task.kind === 'delegate' && (!task.tools || task.tools.length === 0)) {
			throw new Error(`Delegate task "${task.id}" must include at least one tool`);
		}
		if (task.kind === 'checkpoint') {
			if (task.deps.length === 0) {
				throw new Error(
					`Checkpoint task "${task.id}" must depend on at least one build-workflow task`,
				);
			}
			const dependsOnBuildWorkflow = task.deps.some(
				(depId) => byId.get(depId)?.kind === 'build-workflow',
			);
			if (!dependsOnBuildWorkflow) {
				throw new Error(
					`Checkpoint task "${task.id}" must depend on at least one build-workflow task`,
				);
			}
		}
	}

	const visiting = new Set<string>();
	const visited = new Set<string>();

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

		// New plans start in awaiting_approval so tick() (which only acts on
		// status==='active') cannot dispatch them before the user approves.
		// Callers flip to 'active' via approvePlan() once approval is confirmed.
		const graph: PlannedTaskGraph = {
			planRunId: metadata.planRunId,
			messageGroupId: metadata.messageGroupId,
			status: 'awaiting_approval',
			tasks: tasks.map<PlannedTaskRecord>((task) => ({
				...task,
				status: 'planned',
			})),
		};

		await this.storage.save(threadId, graph);
		return graph;
	}

	/**
	 * Transition a graph from `awaiting_approval` → `active` after the user
	 * approves the plan. Callers (create-tasks, submit-plan) must invoke this
	 * before schedulePlannedTasks() so tick() can begin dispatching. No-op on
	 * any other status (a cancelled plan stays cancelled, an already-active
	 * plan doesn't regress).
	 */
	async approvePlan(threadId: string): Promise<PlannedTaskGraph | null> {
		return await this.storage.update(threadId, (graph) => {
			if (graph.status === 'awaiting_approval') {
				return { ...graph, status: 'active' };
			}
			return graph;
		});
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

	/**
	 * Guarded terminal transition for checkpoint tasks only.
	 * Rejects when the target is missing, not a checkpoint, or not running.
	 * Prevents accidental corruption of the graph via a wrong `taskId`.
	 */
	async markCheckpointSucceeded(
		threadId: string,
		taskId: string,
		update: { result?: string; outcome?: Record<string, unknown>; finishedAt?: number },
	): Promise<CheckpointSettleResult> {
		let result: CheckpointSettleResult = { ok: false, reason: 'not-found' };

		await this.storage.update(threadId, (graph) => {
			const task = graph.tasks.find((t) => t.id === taskId);
			if (!task) {
				result = { ok: false, reason: 'not-found' };
				return graph;
			}
			if (task.kind !== 'checkpoint') {
				result = { ok: false, reason: 'wrong-kind', actual: { kind: task.kind } };
				return graph;
			}
			if (task.status !== 'running') {
				result = { ok: false, reason: 'wrong-status', actual: { status: task.status } };
				return graph;
			}

			const next = updateTaskRecord(graph, taskId, (t) => ({
				...t,
				status: 'succeeded',
				result: update.result ?? t.result,
				outcome: update.outcome ?? t.outcome,
				finishedAt: update.finishedAt ?? Date.now(),
				error: undefined,
			}));
			if (!next) {
				result = { ok: false, reason: 'not-found' };
				return graph;
			}
			result = { ok: true, graph: next };
			return next;
		});

		return result;
	}

	/**
	 * Rewind a running checkpoint back to `planned` so the next scheduler tick
	 * re-emits the same `orchestrate-checkpoint` action. Used by the service when
	 * `startInternalFollowUpRun` no-ops due to a scheduling race (another run
	 * became active between `markRunning` and the follow-up dispatch). Unlike
	 * `markCheckpointFailed` this does NOT cascade cancel to dependents — the
	 * checkpoint hasn't actually failed, it just lost a schedule slot and will
	 * run on the next tick.
	 */
	async revertCheckpointToPlanned(
		threadId: string,
		taskId: string,
	): Promise<CheckpointSettleResult> {
		let result: CheckpointSettleResult = { ok: false, reason: 'not-found' };

		await this.storage.update(threadId, (graph) => {
			const task = graph.tasks.find((t) => t.id === taskId);
			if (!task) {
				result = { ok: false, reason: 'not-found' };
				return graph;
			}
			if (task.kind !== 'checkpoint') {
				result = { ok: false, reason: 'wrong-kind', actual: { kind: task.kind } };
				return graph;
			}
			if (task.status !== 'running') {
				result = { ok: false, reason: 'wrong-status', actual: { status: task.status } };
				return graph;
			}

			const tasks = graph.tasks.map<PlannedTaskRecord>((t) => {
				if (t.id !== taskId) return t;
				const { agentId: _agentId, startedAt: _startedAt, ...rest } = t;
				return { ...rest, status: 'planned' };
			});

			const next: PlannedTaskGraph = { ...graph, tasks };
			result = { ok: true, graph: next };
			return next;
		});

		return result;
	}

	async markCheckpointFailed(
		threadId: string,
		taskId: string,
		update: {
			error?: string;
			/** Structured outcome (executionId, failureNode, etc.). Preserved on the
			 *  failed task so replans have execution context, not just an error string. */
			outcome?: Record<string, unknown>;
			finishedAt?: number;
		},
	): Promise<CheckpointSettleResult> {
		let result: CheckpointSettleResult = { ok: false, reason: 'not-found' };

		await this.storage.update(threadId, (graph) => {
			const task = graph.tasks.find((t) => t.id === taskId);
			if (!task) {
				result = { ok: false, reason: 'not-found' };
				return graph;
			}
			if (task.kind !== 'checkpoint') {
				result = { ok: false, reason: 'wrong-kind', actual: { kind: task.kind } };
				return graph;
			}
			if (task.status !== 'running') {
				result = { ok: false, reason: 'wrong-status', actual: { status: task.status } };
				return graph;
			}

			const dependents = collectDependents(graph, taskId);
			const finishedAt = update.finishedAt ?? Date.now();
			const failureError = update.error ?? task.error ?? 'Checkpoint failed';

			const tasks = graph.tasks.map<PlannedTaskRecord>((t) => {
				if (t.id === taskId) {
					return {
						...t,
						status: 'failed',
						error: failureError,
						outcome: update.outcome ?? t.outcome,
						finishedAt,
					};
				}
				if (dependents.has(t.id) && (t.status === 'planned' || t.status === 'running')) {
					return {
						...t,
						status: 'cancelled',
						error: `Cancelled: dependency "${taskId}" failed`,
						finishedAt,
					};
				}
				return t;
			});

			const next: PlannedTaskGraph = { ...graph, tasks };
			result = { ok: true, graph: next };
			return next;
		});

		return result;
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

			// Checkpoints run inline in the orchestrator (sequential, one per follow-up run).
			// Give them priority over background dispatch to keep sequencing clean.
			const readyCheckpoint = readyTasks.find((t) => t.kind === 'checkpoint');
			if (readyCheckpoint) {
				action = { type: 'orchestrate-checkpoint', graph, tasks: [readyCheckpoint] };
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

	/**
	 * Revert the graph's status back to `active` when a pending follow-up action
	 * (replan or synthesize) couldn't be dispatched — typically because a user
	 * chat run was live at the moment the scheduler tried to start the internal
	 * follow-up. Without this, tick() returns `none` for non-active graphs and
	 * the follow-up is silently lost. The next tick sees the graph active again
	 * and re-emits the same action.
	 *
	 * Only transitions from `awaiting_replan` or `completed` — never from
	 * `cancelled` (a user-cancelled plan must stay cancelled).
	 */
	async revertToActive(threadId: string): Promise<PlannedTaskGraph | null> {
		return await this.storage.update(threadId, (graph) => {
			if (graph.status === 'awaiting_replan' || graph.status === 'completed') {
				return { ...graph, status: 'active' };
			}
			return graph;
		});
	}
}
