import {
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	type DelegateSubAgentToolOutput,
	type JSONValue,
} from '@n8n/agents';
import { APPROVAL_SUSPEND_SCHEMA } from '@n8n/agents/tool';
import type { SubAgentSource, SubAgentTaskDifficulty } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import {
	AgentBackgroundJobService,
	SUB_AGENT_BACKGROUND_TIMEOUT_MS,
	type BackgroundJobReceipt,
} from './agent-background-job.service';
import type {
	AgentBackgroundJob,
	AgentBackgroundJobSuspension,
} from '../entities/agent-background-job.entity';
import type { AgentBackgroundJobSettlement } from '../repositories/agent-background-job.repository';
import { formatSubAgentToolOutput } from '../sub-agents/format-sub-agent-tool-output';
import {
	SubAgentRunner,
	type SubAgentRunContext,
	type SubAgentRunResult,
} from '../sub-agents/sub-agent-runner';

/** The parent run's context a detached child inherits at spawn and at resume. */
export type BackgroundRunContext = { projectId: string } & Pick<
	SubAgentRunContext,
	'credentialProvider' | 'runType' | 'workflowToolExecutionMode' | 'user' | 'instrumentation'
>;

export interface BackgroundSpawnRequest {
	subAgentId: string;
	source: SubAgentSource;
	taskName: string;
	goal: string;
	context?: string;
	expectedOutput?: string;
	/** Self-delegation only: model tier override applied by the runner. */
	difficulty?: SubAgentTaskDifficulty;
	parentThreadId: string;
	parentResourceId: string;
	parentSandboxPrincipalHash?: string;
}

type DispatchedJob = Pick<
	AgentBackgroundJob,
	'id' | 'parentAgentId' | 'parentThreadId' | 'title' | 'subAgentId' | 'childThreadId'
>;

type SuspensionBase = Pick<AgentBackgroundJobSuspension, 'goal' | 'difficulty'>;

/**
 * Dispatches a configured sub-agent as a detached run: the job row and the
 * child thread id are minted before the run starts, the returned receipt is
 * the model's only handle, and the run itself is not awaited — it settles the
 * job row whenever it finishes, long after the parent's turn ended.
 */
@Service()
export class SubAgentBackgroundRunner {
	/** Disambiguates task paths of same-named jobs; cosmetic, per process. */
	private dispatchCounter = 0;

	constructor(
		private readonly runner: SubAgentRunner,
		private readonly jobService: AgentBackgroundJobService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async spawn(
		request: BackgroundSpawnRequest,
		context: BackgroundRunContext & { parentAgentId: string },
	): Promise<BackgroundJobReceipt> {
		// Throws on an unusable task name — before the job row exists, so a bad
		// name cannot leave a phantom `running` row holding a thread slot.
		const taskPath = createChildSubAgentTaskPath(request.taskName, this.dispatchCounter++);

		const jobId = uuid();
		const childThreadId = uuid();

		const receipt = await this.jobService.registerSubAgentJob({
			id: jobId,
			parentAgentId: context.parentAgentId,
			parentThreadId: request.parentThreadId,
			title: request.taskName,
			subAgentId: request.subAgentId,
			childThreadId,
		});
		if (receipt.status !== 'started') return receipt;

		this.dispatch(
			{
				id: jobId,
				parentAgentId: context.parentAgentId,
				parentThreadId: request.parentThreadId,
				title: request.taskName,
				subAgentId: request.subAgentId,
				childThreadId,
			},
			async (abortSignal) =>
				await this.runner.run(
					{
						goal: request.goal,
						source: request.source,
						...(request.context !== undefined ? { context: request.context } : {}),
						...(request.expectedOutput !== undefined
							? { expectedOutput: request.expectedOutput }
							: {}),
						parentThreadId: request.parentThreadId,
						parentResourceId: request.parentResourceId,
						...(request.parentSandboxPrincipalHash !== undefined
							? { parentSandboxPrincipalHash: request.parentSandboxPrincipalHash }
							: {}),
						childThreadId,
						taskPath,
					},
					{
						projectId: context.projectId,
						parentAgentId: context.parentAgentId,
						credentialProvider: context.credentialProvider,
						runType: context.runType,
						workflowToolExecutionMode: context.workflowToolExecutionMode,
						user: context.user,
						instrumentation: context.instrumentation,
						abortSignal,
						...(request.difficulty !== undefined
							? { selfDelegationDifficulty: request.difficulty }
							: {}),
					},
				),
			{ goal: request.goal, difficulty: request.difficulty },
		);

		return receipt;
	}

	/** Continue a parked child with the human's answer; settles the job like `spawn` does. */
	resume(
		job: AgentBackgroundJob,
		suspension: AgentBackgroundJobSuspension,
		resumeData: unknown,
		context: BackgroundRunContext,
	): void {
		if (!job.subAgentId || !job.childThreadId) {
			throw new UnexpectedError('Background job is missing its sub-agent identity');
		}
		const taskPath = suspension.taskPath;
		assertSubAgentTaskPath(taskPath);
		const { subAgentId, childThreadId } = job;

		this.dispatch(
			job,
			async (abortSignal) =>
				await this.runner.resumeForeground(
					{
						subAgentId,
						taskName: job.title,
						goal: suspension.goal,
						taskPath,
						childCount: 0,
						parentThreadId: job.parentThreadId,
						childRunId: suspension.childRunId,
						childToolCallId: suspension.childToolCallId,
						childThreadId,
						resumeContext: suspension.resumeContext,
						resumeData,
						...(suspension.difficulty !== undefined ? { difficulty: suspension.difficulty } : {}),
					},
					{
						projectId: context.projectId,
						parentAgentId: job.parentAgentId,
						credentialProvider: context.credentialProvider,
						runType: context.runType,
						workflowToolExecutionMode: context.workflowToolExecutionMode,
						user: context.user,
						instrumentation: context.instrumentation,
						abortSignal,
						...(suspension.difficulty !== undefined
							? { selfDelegationDifficulty: suspension.difficulty }
							: {}),
					},
				),
			{ goal: suspension.goal, difficulty: suspension.difficulty },
		);
	}

	private dispatch(
		job: DispatchedJob,
		run: (abortSignal: AbortSignal) => Promise<SubAgentRunResult>,
		suspensionBase: SuspensionBase,
	): void {
		// The job runs on its own abort scope because the parent's signal dies
		// with the chat connection.
		const abortController = new AbortController();
		this.jobService.registerAbortController(job.id, abortController);
		const timeout = setTimeout(() => {
			// Settle first so the timeout is recorded as the reason; the aborted
			// run's own settle then loses to this one.
			void this.jobService
				.settle(job.id, {
					status: 'failed',
					error: `Timed out after ${Math.round(SUB_AGENT_BACKGROUND_TIMEOUT_MS / 60_000)} minutes`,
				})
				.catch((error: unknown) => {
					// A rejection escaping this detached chain would surface as an
					// unhandled rejection; the sweeper reconciles the row later.
					this.logger.error('Failed to settle timed-out background job', {
						jobId: job.id,
						error,
					});
				})
				.finally(() => abortController.abort());
		}, SUB_AGENT_BACKGROUND_TIMEOUT_MS);
		timeout.unref();

		void run(abortController.signal)
			.then(
				async (result) => await this.finish(job, result, suspensionBase),
				async (error: unknown) =>
					await this.settleAndLog(job.id, {
						status: 'failed',
						error: error instanceof Error ? error.message : String(error),
					}),
			)
			.catch((error: unknown) => {
				// Only the settle write itself can land here: don't overwrite the
				// outcome (a completed answer must not become 'failed' over a DB
				// blip) and don't let the rejection escape the detached chain —
				// the sweeper reconciles the still-running row later.
				this.logger.error('Failed to settle background sub-agent job', {
					jobId: job.id,
					error,
				});
			})
			.finally(() => clearTimeout(timeout));
	}

	private async finish(
		job: DispatchedJob,
		result: SubAgentRunResult,
		suspensionBase: SuspensionBase,
	): Promise<void> {
		const output = formatSubAgentToolOutput(result);
		if (output.status !== 'suspended') {
			await this.settleAndLog(job.id, settlementFor(output));
			return;
		}

		// Only approvals can be proxied through the parent's check_background_jobs
		// call; any other request for input has no one to answer it.
		const pending = output.pendingSuspend?.[0];
		const approval = APPROVAL_SUSPEND_SCHEMA.safeParse(pending?.suspendPayload);
		if (
			!output.runId ||
			!pending ||
			!approval.success ||
			output.resumeContext === undefined ||
			!job.subAgentId
		) {
			await this.jobService.settleSuspended(
				job.id,
				{
					status: 'failed',
					error: 'Sub-agent asked for human input that cannot be answered from a background job',
				},
				output.runId && job.subAgentId
					? { runId: output.runId, agentId: job.subAgentId }
					: undefined,
			);
			return;
		}

		await this.jobService.park(job.id, {
			...suspensionBase,
			childRunId: output.runId,
			childToolCallId: pending.toolCallId,
			childAgentId: job.subAgentId,
			suspendPayload: { ...approval.data, args: approval.data.args as JSONValue },
			taskPath: result.taskPath,
			resumeContext: output.resumeContext,
		});
	}

	private async settleAndLog(
		jobId: string,
		settlement: AgentBackgroundJobSettlement,
	): Promise<void> {
		const settled = await this.jobService.settle(jobId, settlement);
		if (settled && settlement.status === 'failed') {
			this.logger.warn('Background sub-agent job failed', { jobId, error: settlement.error });
		}
	}
}

function settlementFor(output: DelegateSubAgentToolOutput): AgentBackgroundJobSettlement {
	if (output.status === 'completed') {
		return { status: 'completed', result: output.answer };
	}
	return {
		status: output.status === 'cancelled' ? 'cancelled' : 'failed',
		error: output.error ?? null,
	};
}
