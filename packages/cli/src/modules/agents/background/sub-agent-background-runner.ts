import { createChildSubAgentTaskPath } from '@n8n/agents';
import type { SubAgentSource, SubAgentTaskDifficulty } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import {
	AgentBackgroundJobService,
	SUB_AGENT_BACKGROUND_TIMEOUT_MS,
	type BackgroundJobReceipt,
} from './agent-background-job.service';
import type { AgentBackgroundJobSettlement } from '../repositories/agent-background-job.repository';
import { formatSubAgentToolOutput } from '../sub-agents/format-sub-agent-tool-output';
import {
	SubAgentRunner,
	type SubAgentRunContext,
	type SubAgentRunResult,
} from '../sub-agents/sub-agent-runner';

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
		this.jobService.registerAbortController(jobId, abortController);
		const timeout = setTimeout(() => {
			// Settle first so the timeout is recorded as the reason; the aborted
			// run's own settle then loses to this one.
			void this.jobService
				.settle(jobId, {
					status: 'failed',
					error: `Timed out after ${Math.round(SUB_AGENT_BACKGROUND_TIMEOUT_MS / 60_000)} minutes`,
				})
				.catch((error: unknown) => {
					// A rejection escaping this detached chain would surface as an
					// unhandled rejection; the sweeper reconciles the row later.
					this.logger.error('Failed to settle timed-out background job', { jobId, error });
				})
				.finally(() => abortController.abort());
		}, SUB_AGENT_BACKGROUND_TIMEOUT_MS);
		timeout.unref();

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
					...(request.difficulty !== undefined
						? { selfDelegationDifficulty: request.difficulty }
						: {}),
				},
			)
			.then((result) => settlementFor(result))
			.catch(
				(error: unknown): AgentBackgroundJobSettlement => ({
					status: 'failed',
					error: error instanceof Error ? error.message : String(error),
				}),
			)
			.then(async (settlement) => {
				const settled = await this.jobService.settle(jobId, settlement);
				if (settled && settlement.status === 'failed') {
					this.logger.warn('Background sub-agent job failed', { jobId, error: settlement.error });
				}
			})
			.catch((error: unknown) => {
				// Only the settle write itself can land here: don't overwrite the
				// outcome (a completed answer must not become 'failed' over a DB
				// blip) and don't let the rejection escape the detached chain —
				// the sweeper reconciles the still-running row later.
				this.logger.error('Failed to settle background sub-agent job', { jobId, error });
			})
			.finally(() => clearTimeout(timeout));

		return receipt;
	}
}

function settlementFor(result: SubAgentRunResult): AgentBackgroundJobSettlement {
	const output = formatSubAgentToolOutput(result);
	if (output.status === 'completed') {
		return { status: 'completed', result: output.answer };
	}
	if (output.status === 'suspended') {
		// Background HITL is not supported yet: nobody can answer the child,
		// so record why instead of leaving the job running forever.
		return {
			status: 'failed',
			error: 'Sub-agent suspended awaiting human input, which background runs do not support',
		};
	}
	return {
		status: output.status === 'cancelled' ? 'cancelled' : 'failed',
		error: output.error ?? null,
	};
}
