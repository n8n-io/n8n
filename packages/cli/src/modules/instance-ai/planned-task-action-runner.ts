import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	orchestratorAgentId,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type PlannedTaskSchedulerAction,
	type PlannedTaskService,
	type PlannedWorkflowVerification,
	type WorkflowBuildOutcome,
} from '@n8n/instance-ai';
import { nanoid } from 'nanoid';

export type PlannedBuildFollowUp = {
	isPlannedBuildFollowUp: true;
	buildTaskId: string;
	workItemId: string;
	isSupportingWorkflowTask?: boolean;
	savedOutcome?: WorkflowBuildOutcome;
};

export type PlannedTaskRunScope = {
	user: User;
	threadId: string;
};

export type PlannedTaskActionRunnerResult = { type: 'done' } | { type: 'continue-scheduling' };

export type PlannedTaskView = {
	sync(scope: PlannedTaskRunScope, graph: PlannedTaskGraph): Promise<void>;
};

export type PlannedTaskRunGate = {
	hasLiveRun(threadId: string): boolean;
};

export type PlannedTaskDispatcher = {
	dispatch(input: {
		scope: PlannedTaskRunScope;
		graph: PlannedTaskGraph;
		tasks: PlannedTaskRecord[];
	}): Promise<void>;
};

export type PlannedTaskFollowUpStarter = {
	startReplan(input: {
		scope: PlannedTaskRunScope;
		graph: PlannedTaskGraph;
		failedTask: PlannedTaskRecord;
	}): Promise<string>;
	startWorkflowVerification(input: {
		scope: PlannedTaskRunScope;
		graph: PlannedTaskGraph;
		verification: PlannedWorkflowVerification;
	}): Promise<string>;
	startSynthesis(input: { scope: PlannedTaskRunScope; graph: PlannedTaskGraph }): Promise<string>;
	startWorkflowBuild(input: {
		scope: PlannedTaskRunScope;
		graph: PlannedTaskGraph;
		task: PlannedTaskRecord;
		workItemId: string;
	}): Promise<string>;
	startCheckpoint(input: {
		scope: PlannedTaskRunScope;
		graph: PlannedTaskGraph;
		task: PlannedTaskRecord;
	}): Promise<string>;
};

export type PlannedWorkflowVerificationTracker = {
	scheduled(verification: PlannedWorkflowVerification): void;
	followUpStartAttempted(verification: PlannedWorkflowVerification, started: boolean): void;
};

export type PlannedWorkflowVerificationGate = {
	revalidate(
		verification: PlannedWorkflowVerification,
	): Promise<PlannedWorkflowVerification | undefined>;
};

type PlannedTaskActionRunnerDeps = {
	scope: PlannedTaskRunScope;
	plannedTaskService: PlannedTaskService;
	logger: Logger;
	view: PlannedTaskView;
	runGate: PlannedTaskRunGate;
	dispatcher: PlannedTaskDispatcher;
	followUps: PlannedTaskFollowUpStarter;
	workflowVerificationGate: PlannedWorkflowVerificationGate;
	workflowVerificationTracker: PlannedWorkflowVerificationTracker;
};

export class PlannedTaskActionRunner {
	constructor(private readonly deps: PlannedTaskActionRunnerDeps) {}

	async run(
		action: Exclude<PlannedTaskSchedulerAction, { type: 'none' }>,
	): Promise<PlannedTaskActionRunnerResult> {
		switch (action.type) {
			case 'replan':
				return await this.runReplan(action);
			case 'orchestrate-workflow-verification':
				return await this.runWorkflowVerification(action);
			case 'synthesize':
				return await this.runSynthesize(action);
			case 'orchestrate-build-workflow':
				return await this.runWorkflowBuild(action);
			case 'orchestrate-checkpoint':
				return await this.runCheckpoint(action);
			case 'dispatch':
				return await this.runDispatch(action);
		}
	}

	private async runReplan(
		action: Extract<PlannedTaskSchedulerAction, { type: 'replan' }>,
	): Promise<PlannedTaskActionRunnerResult> {
		const { scope } = this.deps;
		await this.deps.view.sync(scope, action.graph);
		const startedRunId = await this.deps.followUps.startReplan({
			scope,
			graph: action.graph,
			failedTask: action.failedTask,
		});
		if (!startedRunId) {
			await this.deps.plannedTaskService.revertToActive(scope.threadId);
		}
		return { type: 'done' };
	}

	private async runWorkflowVerification(
		action: Extract<PlannedTaskSchedulerAction, { type: 'orchestrate-workflow-verification' }>,
	): Promise<PlannedTaskActionRunnerResult> {
		const { scope } = this.deps;
		const { verification } = action;
		this.deps.workflowVerificationTracker.scheduled(verification);
		const currentVerification = await this.deps.workflowVerificationGate.revalidate(verification);
		if (!currentVerification) {
			this.deps.workflowVerificationTracker.followUpStartAttempted(verification, false);
			return { type: 'continue-scheduling' };
		}

		await this.deps.view.sync(scope, action.graph);

		const startedRunId = await this.deps.followUps.startWorkflowVerification({
			scope,
			graph: action.graph,
			verification: currentVerification,
		});
		this.deps.workflowVerificationTracker.followUpStartAttempted(
			currentVerification,
			startedRunId.length > 0,
		);
		return { type: 'done' };
	}

	private async runSynthesize(
		action: Extract<PlannedTaskSchedulerAction, { type: 'synthesize' }>,
	): Promise<PlannedTaskActionRunnerResult> {
		const { scope } = this.deps;
		await this.deps.view.sync(scope, action.graph);
		const startedRunId = await this.deps.followUps.startSynthesis({ scope, graph: action.graph });
		if (!startedRunId) {
			await this.deps.plannedTaskService.revertToActive(scope.threadId);
		}
		return { type: 'done' };
	}

	private async runWorkflowBuild(
		action: Extract<PlannedTaskSchedulerAction, { type: 'orchestrate-build-workflow' }>,
	): Promise<PlannedTaskActionRunnerResult> {
		const { scope } = this.deps;
		if (this.deps.runGate.hasLiveRun(scope.threadId)) return { type: 'done' };

		const buildTask = action.tasks[0];
		if (!buildTask) {
			this.deps.logger.warn('Build workflow scheduler action had no task to run', {
				threadId: scope.threadId,
				planRunId: action.graph.planRunId,
			});
			return { type: 'done' };
		}

		const workItemId = buildTask.workflowId
			? `${action.graph.planRunId}:default`
			: `wi_${nanoid(8)}`;
		await this.deps.plannedTaskService.markRunning(scope.threadId, buildTask.id, {
			agentId: orchestratorAgentId(action.graph.planRunId),
		});
		const graphAfterMark =
			(await this.deps.plannedTaskService.getGraph(scope.threadId)) ?? action.graph;
		await this.deps.view.sync(scope, graphAfterMark);

		const buildTaskRecord = graphAfterMark.tasks.find((t) => t.id === buildTask.id) ?? buildTask;
		const startedRunId = await this.deps.followUps.startWorkflowBuild({
			scope,
			graph: graphAfterMark,
			task: buildTaskRecord,
			workItemId,
		});

		if (!startedRunId) {
			this.deps.logger.warn(
				'Build workflow follow-up run did not start - reverting build task to planned for retry',
				{ threadId: scope.threadId, buildTaskId: buildTask.id },
			);
			await this.deps.plannedTaskService.revertBuildWorkflowToPlanned(scope.threadId, buildTask.id);
		}
		return { type: 'done' };
	}

	private async runCheckpoint(
		action: Extract<PlannedTaskSchedulerAction, { type: 'orchestrate-checkpoint' }>,
	): Promise<PlannedTaskActionRunnerResult> {
		const { scope } = this.deps;
		if (this.deps.runGate.hasLiveRun(scope.threadId)) return { type: 'done' };

		const checkpoint = action.tasks[0];
		if (!checkpoint) {
			this.deps.logger.warn('Checkpoint scheduler action had no task to run', {
				threadId: scope.threadId,
				planRunId: action.graph.planRunId,
			});
			return { type: 'done' };
		}

		await this.deps.plannedTaskService.markRunning(scope.threadId, checkpoint.id, {
			agentId: orchestratorAgentId(action.graph.planRunId),
		});
		const graphAfterMark =
			(await this.deps.plannedTaskService.getGraph(scope.threadId)) ?? action.graph;
		await this.deps.view.sync(scope, graphAfterMark);

		const checkpointRecord = graphAfterMark.tasks.find((t) => t.id === checkpoint.id) ?? checkpoint;

		const startedRunId = await this.deps.followUps.startCheckpoint({
			scope,
			graph: graphAfterMark,
			task: checkpointRecord,
		});

		if (!startedRunId) {
			this.deps.logger.warn(
				'Checkpoint follow-up run did not start - reverting checkpoint to planned for retry',
				{ threadId: scope.threadId, checkpointTaskId: checkpoint.id },
			);
			await this.deps.plannedTaskService.revertCheckpointToPlanned(scope.threadId, checkpoint.id);
		}
		return { type: 'done' };
	}

	private async runDispatch(
		action: Extract<PlannedTaskSchedulerAction, { type: 'dispatch' }>,
	): Promise<PlannedTaskActionRunnerResult> {
		await this.deps.dispatcher.dispatch({
			scope: this.deps.scope,
			graph: action.graph,
			tasks: action.tasks,
		});
		return { type: 'continue-scheduling' };
	}
}
