import type { Logger } from '@n8n/backend-common';
import type { TaskList } from '@n8n/api-types';
import type { User } from '@n8n/db';
import {
	applyPlannedTaskPermissions,
	createAllTools,
	createMemory,
	MastraTaskStorage,
	PlannedTaskCoordinator,
	PlannedTaskStorage,
	startBuildWorkflowAgentTask,
	startDataTableAgentTask,
	startDetachedDelegateTask,
	startResearchAgentTask,
	type BackgroundTaskManager,
	type ManagedBackgroundTask,
	type OrchestrationContext,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type RunStateRegistry,
} from '@n8n/instance-ai';

import { AUTO_FOLLOW_UP_MESSAGE } from '../internal-messages';

type CheckpointFollowUp = { isCheckpointFollowUp: true; checkpointTaskId: string };

type ExecutionEnvironment = {
	orchestrationContext: OrchestrationContext;
};

function stringifyForContextValue(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

const PLANNED_TASK_CONTEXT_VALUE_LIMIT = 1_500;

function truncateContextValue(value: string): string {
	if (value.length <= PLANNED_TASK_CONTEXT_VALUE_LIMIT) return value;
	return `${value.slice(0, PLANNED_TASK_CONTEXT_VALUE_LIMIT)}...`;
}

function buildPlannedTaskConversationContext(
	task: PlannedTaskRecord,
	graph: PlannedTaskGraph | undefined,
): string | undefined {
	if (!graph) return undefined;

	const parts: string[] = [
		`Approved plan task: ${task.title}`,
		`Task id: ${task.id}`,
		`Task kind: ${task.kind}`,
		`Plan run id: ${graph.planRunId}`,
	];

	if (task.workflowId) {
		parts.push(`Target workflow id: ${task.workflowId}`);
	}

	const dependencies = graph.tasks.filter((candidate) => task.deps.includes(candidate.id));
	if (dependencies.length > 0) {
		parts.push('Completed dependency context:');
		for (const dependency of dependencies) {
			const dependencyParts = [
				`- ${dependency.id} (${dependency.kind}, ${dependency.status}): ${dependency.title}`,
			];
			if (dependency.result) {
				dependencyParts.push(`result=${truncateContextValue(dependency.result)}`);
			}
			if (dependency.error) {
				dependencyParts.push(`error=${truncateContextValue(dependency.error)}`);
			}
			if (dependency.outcome) {
				dependencyParts.push(
					`outcome=${truncateContextValue(stringifyForContextValue(dependency.outcome))}`,
				);
			}
			parts.push(dependencyParts.join(' '));
		}
	}

	return parts.join('\n');
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function createInertAbortSignal(): AbortSignal {
	return new AbortController().signal;
}

export class InstanceAiPlannedTaskService {
	private readonly schedulerLocks = new Map<string, Promise<void>>();

	constructor(
		private readonly deps: {
			orchestratorAgentId: string;
			maxConcurrentBackgroundTasksPerThread: number;
			defaultTimeZone: string;
			eventBus: {
				publish: (
					threadId: string,
					event: Parameters<OrchestrationContext['eventBus']['publish']>[1],
				) => void;
			};
			logger: Pick<Logger, 'warn'>;
			runState: Pick<
				RunStateRegistry<User>,
				'startRun' | 'hasLiveRun' | 'getTimeZone' | 'getThreadResearchMode'
			>;
			backgroundTasks: Pick<BackgroundTaskManager, 'getRunningTasks'>;
			createMemoryConfig: () => Parameters<typeof createMemory>[0];
			revalidateActiveUser: (userId: string) => Promise<User | null>;
			cancelRun: (threadId: string) => void;
			createExecutionEnvironment: (
				user: User,
				threadId: string,
				runId: string,
				abortSignal: AbortSignal,
				researchMode?: boolean,
				messageGroupId?: string,
				pushRef?: string,
			) => Promise<ExecutionEnvironment>;
			executeRun: (args: {
				user: User;
				threadId: string;
				runId: string;
				message: string;
				abortController: AbortController;
				researchMode?: boolean;
				messageGroupId?: string;
				timeZone?: string;
				isReplanFollowUp?: boolean;
				checkpoint?: CheckpointFollowUp;
			}) => void;
			getThreadPushRef: (threadId: string) => string | undefined;
		},
	) {}

	async createPlannedTaskState() {
		const memory = createMemory(this.deps.createMemoryConfig());
		const taskStorage = new MastraTaskStorage(memory);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);
		return { memory, taskStorage, plannedTaskService };
	}

	buildPlannedTaskFollowUpMessage(
		type: 'synthesize' | 'replan' | 'checkpoint',
		graph: PlannedTaskGraph,
		options: { failedTask?: PlannedTaskRecord; checkpoint?: PlannedTaskRecord } = {},
	): string {
		const payload: Record<string, unknown> = {
			tasks: graph.tasks.map((task) => ({
				id: task.id,
				title: task.title,
				kind: task.kind,
				status: task.status,
				result: task.result,
				error: task.error,
				outcome: task.outcome,
			})),
		};

		if (options.failedTask) {
			payload.failedTask = {
				id: options.failedTask.id,
				title: options.failedTask.title,
				kind: options.failedTask.kind,
				error: options.failedTask.error,
				result: options.failedTask.result,
			};
		}

		if (options.checkpoint) {
			const depOutcomes = graph.tasks
				.filter((task) => options.checkpoint!.deps.includes(task.id))
				.map((task) => ({
					id: task.id,
					title: task.title,
					kind: task.kind,
					status: task.status,
					result: task.result,
					outcome: task.outcome,
				}));
			payload.checkpoint = {
				id: options.checkpoint.id,
				title: options.checkpoint.title,
				instructions: options.checkpoint.spec,
				dependsOn: depOutcomes,
			};
		}

		return `<planned-task-follow-up type="${type}">\n${JSON.stringify(payload, null, 2)}\n</planned-task-follow-up>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	async syncPlannedTasksToUi(threadId: string, graph: PlannedTaskGraph): Promise<void> {
		const { taskStorage } = await this.createPlannedTaskState();
		const tasks = this.projectPlannedTaskList(graph);
		await taskStorage.save(threadId, tasks);
		this.deps.eventBus.publish(threadId, {
			type: 'tasks-update',
			runId: graph.planRunId,
			agentId: this.deps.orchestratorAgentId,
			payload: { tasks },
		});
	}

	async cancelAwaitingApprovalPlan(threadId: string): Promise<void> {
		try {
			const { plannedTaskService, taskStorage } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			if (!graph || graph.status !== 'awaiting_approval') return;

			await plannedTaskService.clear(threadId);
			await taskStorage.save(threadId, { tasks: [] });
			this.deps.eventBus.publish(threadId, {
				type: 'tasks-update',
				runId: graph.planRunId,
				agentId: this.deps.orchestratorAgentId,
				payload: { tasks: { tasks: [] }, planItems: [] },
			});
		} catch (error) {
			this.deps.logger.warn('Failed to clean up awaiting_approval plan on cancel', {
				threadId,
				error: getErrorMessage(error),
			});
		}
	}

	async getCheckpointAllowedWorkflowIds(
		threadId: string,
		checkpointTaskId: string,
	): Promise<ReadonlySet<string>> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((task) => task.id === checkpointTaskId);
			if (!graph || !checkpoint) return new Set();
			const deps = new Set(checkpoint.deps);
			const allowed = new Set<string>();
			for (const task of graph.tasks) {
				if (!deps.has(task.id)) continue;
				const workflowId = task.outcome?.workflowId;
				if (typeof workflowId === 'string' && workflowId.length > 0) {
					allowed.add(workflowId);
				}
			}
			return allowed;
		} catch (error) {
			this.deps.logger.warn('Failed to resolve checkpoint allowed workflow IDs', {
				threadId,
				checkpointTaskId,
				error: getErrorMessage(error),
			});
			return new Set();
		}
	}

	async handlePlannedTaskSettlement(
		user: User,
		task: ManagedBackgroundTask,
		status: 'succeeded' | 'failed' | 'cancelled',
	): Promise<void> {
		if (!task.plannedTaskId) return;

		const { plannedTaskService } = await this.createPlannedTaskState();
		let graph: PlannedTaskGraph | null = null;

		if (status === 'succeeded') {
			graph = await plannedTaskService.markSucceeded(task.threadId, task.plannedTaskId, {
				result: task.result,
				outcome: task.outcome,
			});
		} else if (status === 'failed') {
			graph = await plannedTaskService.markFailed(task.threadId, task.plannedTaskId, {
				error: task.error,
			});
		} else {
			graph = await plannedTaskService.markCancelled(task.threadId, task.plannedTaskId, {
				error: task.error,
			});
		}

		if (graph) {
			await this.syncPlannedTasksToUi(task.threadId, graph);
		}

		await this.schedulePlannedTasks(user, task.threadId);
	}

	async startInternalFollowUpRun(
		user: User,
		threadId: string,
		message: string,
		researchMode: boolean | undefined,
		messageGroupId?: string,
		isReplanFollowUp: boolean = false,
		checkpoint?: CheckpointFollowUp,
	): Promise<string> {
		if (this.deps.runState.hasLiveRun(threadId)) {
			this.deps.logger.warn('Skipping internal follow-up: active run exists', { threadId });
			return '';
		}

		const { runId, abortController } = this.deps.runState.startRun({
			threadId,
			user,
			researchMode,
			messageGroupId,
		});

		const timeZone = this.deps.runState.getTimeZone(threadId) ?? this.deps.defaultTimeZone;

		this.deps.executeRun({
			user,
			threadId,
			runId,
			message,
			abortController,
			researchMode,
			messageGroupId,
			timeZone,
			isReplanFollowUp,
			checkpoint,
		});

		return runId;
	}

	async schedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const prev = this.schedulerLocks.get(threadId) ?? Promise.resolve();
		const current = prev
			.then(async () => await this.doSchedulePlannedTasks(user, threadId))
			.catch(() => {});
		this.schedulerLocks.set(threadId, current);
		await current;
	}

	clearThread(threadId: string): void {
		this.schedulerLocks.delete(threadId);
	}

	private projectPlannedTaskList(graph: PlannedTaskGraph): TaskList {
		return {
			tasks: graph.tasks.map((task) => ({
				id: task.id,
				description: task.title,
				status:
					task.status === 'planned'
						? 'todo'
						: task.status === 'running'
							? 'in_progress'
							: task.status === 'succeeded'
								? 'done'
								: task.status,
			})),
		};
	}

	private async doSchedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const revalidated = await this.deps.revalidateActiveUser(user.id);
		if (!revalidated) {
			this.deps.logger.warn('Cancelling run: user no longer authorized for AI Assistant', {
				userId: user.id,
				threadId,
			});
			this.deps.cancelRun(threadId);
			return;
		}

		const activeUser = revalidated;

		const { plannedTaskService } = await this.createPlannedTaskState();
		const graph = await plannedTaskService.getGraph(threadId);
		if (!graph) return;

		await this.syncPlannedTasksToUi(threadId, graph);

		const availableSlots = Math.max(
			0,
			this.deps.maxConcurrentBackgroundTasksPerThread -
				this.deps.backgroundTasks.getRunningTasks(threadId).length,
		);
		const action = await plannedTaskService.tick(threadId, { availableSlots });
		if (action.type === 'none') return;

		if (action.type === 'replan') {
			await this.syncPlannedTasksToUi(threadId, action.graph);
			const startedRunId = await this.startInternalFollowUpRun(
				activeUser,
				threadId,
				this.buildPlannedTaskFollowUpMessage('replan', action.graph, {
					failedTask: action.failedTask,
				}),
				this.deps.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
				true,
			);
			if (!startedRunId) {
				await plannedTaskService.revertToActive(threadId);
			}
			return;
		}

		if (action.type === 'synthesize') {
			await this.syncPlannedTasksToUi(threadId, action.graph);
			const startedRunId = await this.startInternalFollowUpRun(
				activeUser,
				threadId,
				this.buildPlannedTaskFollowUpMessage('synthesize', action.graph),
				this.deps.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
			);
			if (!startedRunId) {
				await plannedTaskService.revertToActive(threadId);
			}
			return;
		}

		if (action.type === 'orchestrate-checkpoint') {
			if (this.deps.runState.hasLiveRun(threadId)) {
				return;
			}

			const checkpoint = action.tasks[0];

			await plannedTaskService.markRunning(threadId, checkpoint.id, {
				agentId: this.deps.orchestratorAgentId,
			});
			const graphAfterMark = (await plannedTaskService.getGraph(threadId)) ?? action.graph;
			await this.syncPlannedTasksToUi(threadId, graphAfterMark);

			const checkpointRecord =
				graphAfterMark.tasks.find((task) => task.id === checkpoint.id) ?? checkpoint;

			const startedRunId = await this.startInternalFollowUpRun(
				activeUser,
				threadId,
				this.buildPlannedTaskFollowUpMessage('checkpoint', graphAfterMark, {
					checkpoint: checkpointRecord,
				}),
				this.deps.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId: checkpoint.id },
			);

			if (!startedRunId) {
				this.deps.logger.warn(
					'Checkpoint follow-up run did not start — reverting checkpoint to planned for retry',
					{ threadId, checkpointTaskId: checkpoint.id },
				);
				await plannedTaskService.revertCheckpointToPlanned(threadId, checkpoint.id);
			}
			return;
		}

		const environment = await this.deps.createExecutionEnvironment(
			activeUser,
			threadId,
			action.graph.planRunId,
			createInertAbortSignal(),
			this.deps.runState.getThreadResearchMode(threadId),
			action.graph.messageGroupId,
			this.deps.getThreadPushRef(threadId),
		);

		for (const task of action.tasks) {
			await this.dispatchPlannedTask(task, environment.orchestrationContext, action.graph);
		}

		await this.doSchedulePlannedTasks(activeUser, threadId);
	}

	private async dispatchPlannedTask(
		task: PlannedTaskRecord,
		context: OrchestrationContext,
		graph?: PlannedTaskGraph,
	): Promise<void> {
		const taskContext = this.createPlannedTaskContext(task.kind, context);
		const conversationContext = buildPlannedTaskConversationContext(task, graph);

		let started: { taskId: string; agentId: string; result: string } | null = null;

		switch (task.kind) {
			case 'build-workflow':
				started = await startBuildWorkflowAgentTask(taskContext, {
					task: task.spec,
					workflowId: task.workflowId,
					plannedTaskId: task.id,
					conversationContext,
				});
				break;
			case 'manage-data-tables':
				started = await startDataTableAgentTask(taskContext, {
					task: task.spec,
					plannedTaskId: task.id,
					conversationContext,
				});
				break;
			case 'research':
				started = await startResearchAgentTask(taskContext, {
					goal: task.title,
					constraints: task.spec,
					plannedTaskId: task.id,
					conversationContext,
				});
				break;
			case 'delegate':
				started = await startDetachedDelegateTask(taskContext, {
					title: task.title,
					spec: task.spec,
					tools: task.tools ?? [],
					plannedTaskId: task.id,
					conversationContext,
				});
				break;
		}

		if (!started?.taskId) {
			await context.plannedTaskService?.markFailed(context.threadId, task.id, {
				error: started?.result || `Failed to start planned task "${task.title}"`,
			});
			return;
		}

		await context.plannedTaskService?.markRunning(context.threadId, task.id, {
			agentId: started.agentId,
			backgroundTaskId: started.taskId,
		});

		const nextGraph = await context.plannedTaskService?.getGraph(context.threadId);
		if (nextGraph) {
			await this.syncPlannedTasksToUi(context.threadId, nextGraph);
		}
	}

	private createPlannedTaskContext(
		kind: PlannedTaskRecord['kind'],
		context: OrchestrationContext,
	): OrchestrationContext {
		if (!context.domainContext) return context;

		const taskDomainContext = applyPlannedTaskPermissions(context.domainContext, kind);
		if (taskDomainContext === context.domainContext) return context;

		return {
			...context,
			domainContext: taskDomainContext,
			domainTools: createAllTools(taskDomainContext),
		};
	}
}
