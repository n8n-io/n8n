import { createChildSubAgentTaskPath } from '@n8n/agents';
import type { SubAgentSource } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import {
	AgentBackgroundJobService,
	SUB_AGENT_BACKGROUND_TIMEOUT_MS,
	type BackgroundJobReceipt,
} from './agent-background-job.service';
import { formatSubAgentToolOutput } from '../sub-agents/delegate-sub-agent-tool';
import { SubAgentRunner, type SubAgentRunContext } from '../sub-agents/sub-agent-runner';

export interface BackgroundSpawnRequest {
	subAgentId: string;
	source: SubAgentSource;
	taskName: string;
	goal: string;
	context?: string;
	expectedOutput?: string;
	dedupeKey?: string;
	parentThreadId: string;
	parentResourceId: string;
	parentSandboxPrincipalHash?: string;
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
	) {
		this.logger = this.logger.scoped('agents');
	}

	async spawn(
		request: BackgroundSpawnRequest,
		context: {
			projectId: string;
			parentAgentId: string;
		} & Pick<
			SubAgentRunContext,
			'credentialProvider' | 'runType' | 'workflowToolExecutionMode' | 'user' | 'instrumentation'
		>,
	): Promise<BackgroundJobReceipt> {
		const jobId = uuid();
		const childThreadId = uuid();

		const receipt = await this.jobService.registerSubAgentJob({
			id: jobId,
			parentAgentId: context.parentAgentId,
			parentThreadId: request.parentThreadId,
			projectId: context.projectId,
			title: request.taskName,
			subAgentId: request.subAgentId,
			childThreadId,
			dedupeKey: request.dedupeKey,
		});
		if (receipt.status !== 'started') return receipt;

		// The job runs on its own abort scope: the parent's signal dies with the
		// chat connection, and the parent's live telemetry does not outlive its
		// turn — neither is forwarded.
		const abortController = new AbortController();
		this.jobService.registerAbortController(jobId, abortController);
		const timeout = setTimeout(() => {
			// Settle first so the timeout is recorded as the reason; the aborted
			// run's own settle then loses to this one.
			void this.jobService
				.settle(jobId, {
					status: 'failed',
					error: `Timed out after ${Math.round(SUB_AGENT_BACKGROUND_TIMEOUT_MS / 60_000)} minutes`,
				})
				.finally(() => abortController.abort());
		}, SUB_AGENT_BACKGROUND_TIMEOUT_MS);
		timeout.unref();

		const taskPath = createChildSubAgentTaskPath(request.taskName, this.dispatchCounter++);
		void this.runner
			.run(
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
					abortSignal: abortController.signal,
				},
			)
			.then(async (result) => {
				const output = formatSubAgentToolOutput(result);
				if (output.status === 'completed') {
					await this.jobService.settle(jobId, { status: 'completed', result: output.answer });
				} else if (output.status === 'suspended') {
					// Background HITL is not supported yet: nobody can answer the child,
					// so record why instead of leaving the job running forever.
					await this.jobService.settle(jobId, {
						status: 'failed',
						error: 'Sub-agent suspended awaiting human input, which background runs do not support',
					});
				} else {
					await this.jobService.settle(jobId, {
						status: output.status === 'cancelled' ? 'cancelled' : 'failed',
						error: output.error ?? null,
					});
				}
			})
			.catch(async (error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				const settled = await this.jobService.settle(jobId, { status: 'failed', error: message });
				if (settled) {
					this.logger.warn('Background sub-agent job failed', { jobId, error: message });
				}
			})
			.finally(() => clearTimeout(timeout));

		return receipt;
	}
}
