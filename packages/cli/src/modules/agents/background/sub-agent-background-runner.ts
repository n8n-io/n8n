import { createChildSubAgentTaskPath } from '@n8n/agents';
import type { SubAgentSource, SubAgentTaskDifficulty } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import {
	AgentBackgroundJobService,
	SUB_AGENT_BACKGROUND_TIMEOUT_MS,
	type BackgroundJobReceipt,
} from './agent-background-job.service';
import type {
	AgentBackgroundJobSettlement,
	ExpectedBackgroundJobState,
} from '../repositories/agent-background-job.repository';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { AgentWorkspaceService } from '../agent-workspace.service';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import type { IntegrationMessageContext } from '../integrations/integration-tool-types';
import { formatSubAgentToolOutput } from '../sub-agents/format-sub-agent-tool-output';
import {
	SubAgentRunner,
	type SubAgentRunContext,
	type SubAgentRunResult,
} from '../sub-agents/sub-agent-runner';

export type BackgroundSubAgentRunContext = Pick<
	SubAgentRunContext,
	| 'credentialProvider'
	| 'runType'
	| 'workflowToolExecutionMode'
	| 'user'
	| 'instrumentation'
	| 'parentWorkspaceHandle'
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
	parentSandboxPrincipalHash: string;
	parentMessageContext?: IntegrationMessageContext | null;
}

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
		private readonly jobRepository: AgentBackgroundJobRepository,
		private readonly workspaceService: AgentWorkspaceService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async spawn(
		request: BackgroundSpawnRequest,
		context: {
			projectId: string;
			parentAgentId: string;
		} & BackgroundSubAgentRunContext,
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
			parentResourceId: request.parentResourceId,
			parentPrincipalHash: request.parentSandboxPrincipalHash,
			title: request.taskName,
			subAgentId: request.subAgentId,
			childThreadId,
		});
		if (receipt.status !== 'started') return receipt;

		// The job runs on its own abort scope: the parent's signal dies with the
		// chat connection, and the parent's live telemetry does not outlive its
		// turn — neither is forwarded.
		const abortController = new AbortController();
		const expected: ExpectedBackgroundJobState = { status: 'running' };
		this.jobService.registerAbortController(jobId, abortController);
		void this.dispatch(jobId, abortController, expected, async () => {
			const job = await this.jobRepository.findById(jobId);
			if (job?.status !== 'running') {
				abortController.abort();
				abortController.signal.throwIfAborted();
			}
			expected.timeoutAt = job?.timeoutAt;
			return await this.runner.run(
				{
					goal: request.goal,
					source: request.source,
					...(request.context !== undefined ? { context: request.context } : {}),
					...(request.expectedOutput !== undefined
						? { expectedOutput: request.expectedOutput }
						: {}),
					parentThreadId: request.parentThreadId,
					parentResourceId: request.parentResourceId,
					parentSandboxPrincipalHash: request.parentSandboxPrincipalHash,
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
					abortSignal: abortController.signal,
					backgroundJobId: jobId,
					parentMessageContext: request.parentMessageContext,
					...(request.difficulty !== undefined
						? { selfDelegationDifficulty: request.difficulty }
						: {}),
					...(context.parentWorkspaceHandle !== undefined
						? { parentWorkspaceHandle: context.parentWorkspaceHandle }
						: {}),
				},
			);
		}).catch((error: unknown) => {
			this.logger.error('Failed to settle background sub-agent job', { jobId, error });
		});

		return receipt;
	}

	async resume(
		job: AgentBackgroundJob,
		response: { token: string; resumeData: unknown },
		context: { projectId: string; parentAgentId: string } & BackgroundSubAgentRunContext,
	): Promise<void> {
		const approval = job.status === 'suspended' && (await this.jobService.getApproval(job));
		if (
			!approval ||
			approval.token !== response.token ||
			approval.scope.projectId !== context.projectId ||
			!job.subAgentId ||
			!job.childThreadId
		) {
			throw new UserError('This background approval is no longer available');
		}
		const { metadata, scope } = approval;
		const workspace = metadata.sharedWorkspace
			? await this.workspaceService.getAgentWorkspace(
					context.projectId,
					job.parentAgentId,
					scope.principalHash,
				)
			: undefined;
		const started = createDeferredPromise();
		const controller = new AbortController();
		const expected: ExpectedBackgroundJobState = { status: 'suspended', timeoutAt: job.timeoutAt };
		let claimed = false;
		let admitted = false;
		void this.dispatch(
			job.id,
			controller,
			expected,
			async () => {
				const result = await this.runner.resumeForeground(
					{
						subAgentId: metadata.resumeContext.agentId,
						childThreadId: job.childThreadId ?? undefined,
						parentThreadId: job.parentThreadId,
						childRunId: approval.runId,
						childToolCallId: approval.pending.toolCallId,
						resumeData: response.resumeData,
						taskPath: metadata.taskPath,
						resumeContext: metadata.resumeContext,
					},
					{
						...context,
						abortSignal: controller.signal,
						selfDelegationDifficulty: metadata.difficulty,
						parentWorkspaceHandle: workspace?.handle,
						beforeResume: async () => {
							// The child thread is reserved here. Recheck the gate after admission.
							const currentJob = await this.jobRepository.findById(job.id);
							const currentApproval =
								currentJob?.status === 'suspended' &&
								(await this.jobService.getApproval(currentJob));
							if (!currentApproval || currentApproval.token !== response.token) {
								throw new UserError('This background approval is no longer available');
							}
						},
						onResumeClaimed: async () => {
							claimed = true;
							this.jobService.registerAbortController(job.id, controller);
							const timeoutAt = new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS);
							if (!(await this.jobService.resume(job.id, timeoutAt))) {
								controller.abort();
								throw new UserError('This background task has already ended');
							}
							expected.status = 'running';
							expected.timeoutAt = timeoutAt;
							admitted = true;
							started.resolve();
						},
					},
				);
				if (!admitted) throw new UserError('This background approval could not be resumed');
				return result;
			},
			() => claimed,
		)
			.then(() => {
				if (!admitted)
					started.reject(new UserError('This background approval could not be resumed'));
			})
			.catch((error: unknown) => {
				started.reject(ensureError(error));
				this.logger.warn('Failed to resume background sub-agent', { jobId: job.id, error });
			});
		await started.promise;
	}

	private async dispatch(
		jobId: string,
		controller: AbortController,
		expected: ExpectedBackgroundJobState,
		run: () => Promise<SubAgentRunResult>,
		ownsRun: () => boolean = () => true,
	): Promise<void> {
		const timeout = setTimeout(() => {
			if (!ownsRun()) {
				controller.abort();
				return;
			}
			void this.jobService
				.settle(
					jobId,
					{
						status: 'failed',
						error: `Timed out after ${Math.round(SUB_AGENT_BACKGROUND_TIMEOUT_MS / 60_000)} minutes`,
					},
					expected,
				)
				.catch((error: unknown) => {
					this.logger.error('Failed to settle timed-out background job', { jobId, error });
				})
				.finally(() => controller.abort());
		}, SUB_AGENT_BACKGROUND_TIMEOUT_MS);
		timeout.unref();
		try {
			let result: SubAgentRunResult;
			try {
				result = await run();
			} catch (error) {
				if (!ownsRun()) throw error;
				await this.jobService.settle(
					jobId,
					{ status: 'failed', error: error instanceof Error ? error.message : String(error) },
					expected,
				);
				return;
			}
			clearTimeout(timeout);
			if (result.status === 'suspended' && (await this.jobService.suspend(jobId))) return;
			await this.jobService.settle(jobId, settlementFor(result), expected);
		} finally {
			clearTimeout(timeout);
			this.jobService.unregisterAbortController(jobId, controller);
		}
	}
}

function settlementFor(result: SubAgentRunResult): AgentBackgroundJobSettlement {
	const output = formatSubAgentToolOutput(result);
	if (output.status === 'completed') {
		return { status: 'completed', result: output.answer };
	}
	if (output.status === 'suspended') {
		return {
			status: 'failed',
			error: 'The background task requested an unsupported interaction',
		};
	}
	return {
		status: output.status === 'cancelled' ? 'cancelled' : 'failed',
		error: output.error ?? null,
	};
}
