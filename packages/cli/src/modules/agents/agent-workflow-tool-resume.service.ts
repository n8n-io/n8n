import type { ToolContext } from '@n8n/agents';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { OnLifecycleEvent, OnPubSubEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { RelatedAgentRun } from 'n8n-workflow';
import { isTerminalExecutionStatus } from 'n8n-workflow';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentResumeAlreadyHandledError } from './agent-resume-already-handled.error';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';
import {
	AgentBackgroundJobService,
	collectResultData,
	serializeWorkflowJobResult,
	settlementStatusForExecution,
} from './background/agent-background-job.service';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { readIntegrationMessageContext } from './integrations/integration-message-context';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';

const RESUME_RETRY_BASE_MS = 1_000;
const RESUME_RETRY_MAX_MS = 30_000;

/** 1 s, 2 s, 4 s, and so on, up to 30 s between attempts. */
function resumeRetryDelayMs(attempt: number): number {
	return Math.min(RESUME_RETRY_BASE_MS * 2 ** attempt, RESUME_RETRY_MAX_MS);
}

/**
 * Wakes the agent tool call a finished sub-execution belongs to, from the
 * `parentAgentRun` marker the workflow tool stamped on it. Hooks the lifecycle
 * event rather than the individual resume paths so every way out of `waiting` is
 * covered — timer, webhook, form, auto-resume, crash recovery.
 */
@Service()
export class AgentWorkflowToolResumeService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly agentTestRunService: AgentTestRunService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly messageContextService: IntegrationMessageContextService,
		private readonly executionUpdateBroadcaster: AgentExecutionUpdateBroadcaster,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly backgroundJobService: AgentBackgroundJobService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	async handleWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext): Promise<void> {
		const agentRun = ctx.runData.data.parentAgentRun;
		if (!agentRun) return; // Not a sub-execution started by an agent workflow tool.
		// Parked at a Wait node, so the workflow has not finished.
		if (ctx.runData.status === 'waiting') return;

		// A backgrounded execution has a job row instead of a suspended checkpoint;
		// settling it is a plain DB write, so it happens right here — also on
		// workers, without the pubsub hop the resume below needs. Deliberately
		// not gated on the feature flag: it is a no-op without a row, and rows
		// created while the flag was on must settle even after it is turned off.
		await this.settleBackgroundJob(ctx);

		// Every sub-execution carries the marker, but only one that actually parked left
		// a suspended checkpoint. Without this an ordinary tool call drives a resume
		// that can only fail, after posting a status message into the user's chat.
		const checkpoint = await this.checkpointStorage.getStatus(agentRun.runId, agentRun.agentId);
		if (checkpoint.status !== 'active' || checkpoint.checkpoint?.status !== 'suspended') return;

		// In queue mode this runs on a worker, which holds no chat connections.
		if (this.instanceSettings.isWorker) {
			await this.publisher.publishCommand({
				command: 'resume-agent-workflow-tool',
				payload: { agentRun, status: ctx.runData.status },
			});
			return;
		}

		await this.resumeSafely(agentRun, ctx.runData.status);
	}

	@OnPubSubEvent('resume-agent-workflow-tool', { instanceType: 'main' })
	async handleResumeRelay({
		agentRun,
		status,
	}: {
		agentRun: RelatedAgentRun;
		status: string;
	}): Promise<void> {
		await this.resumeSafely(agentRun, status);
	}

	/**
	 * Settle the background job tracking this execution, carrying a bounded
	 * serialization of the result — the run data is in memory here, so the job
	 * row gets its answer without a later read of the executions table. Job
	 * results carry the last node's output only: the row does not know the
	 * tool's `allOutputs` setting, so it keeps the tightest projection and the
	 * execution keeps the full data. A no-op when the execution was not
	 * backgrounded. Never throws into the execution's lifecycle.
	 */
	private async settleBackgroundJob(ctx: WorkflowExecuteAfterContext): Promise<void> {
		const { status, data } = ctx.runData;
		if (!isTerminalExecutionStatus(status)) return;
		// A success callback for a run that has not actually finished must not
		// seal the job with partial output; reconciliation settles it later.
		if (status === 'success' && !ctx.runData.finished) return;

		try {
			const settlementStatus = settlementStatusForExecution(status);
			const runData = data.resultData?.runData;
			await this.backgroundJobService.settleWorkflowJobByExecutionId(ctx.executionId, {
				status: settlementStatus,
				result:
					settlementStatus === 'completed' && runData
						? serializeWorkflowJobResult(collectResultData(runData, false))
						: null,
				error: data.resultData?.error?.message ?? null,
			});
		} catch (error) {
			this.logger.error('Failed to settle workflow background job', {
				executionId: ctx.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Never let a failed agent resume disturb the execution that triggered it.
	 * While another turn holds the session, the next attempt runs later, off
	 * this lifecycle hook.
	 */
	private async resumeSafely(
		agentRun: RelatedAgentRun,
		status: string,
		attempt = 0,
	): Promise<void> {
		if (!(await this.tryResume(agentRun, status))) return;
		setTimeout(() => {
			void this.resumeSafely(agentRun, status, attempt + 1);
		}, resumeRetryDelayMs(attempt)).unref();
	}

	/** Never throws. Returns true when the session is busy and a retry is due. */
	private async tryResume(agentRun: RelatedAgentRun, status: string): Promise<boolean> {
		try {
			await this.resume(agentRun, status);
			return false;
		} catch (error) {
			return this.handleResumeError(agentRun, error);
		}
	}

	/** Logs a failed resume. Returns true when the session is busy and a retry is due. */
	private handleResumeError(agentRun: RelatedAgentRun, error: unknown): boolean {
		const { agentId, runId } = agentRun;
		if (error instanceof AgentTurnAlreadyRunningError) return true;
		if (error instanceof AgentResumeAlreadyHandledError) {
			this.logger.debug('Agent run was already resumed', { agentId, runId });
			return false;
		}
		this.logger.error('Failed to resume agent run after sub-workflow completed', {
			agentId,
			runId,
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}

	/** The tool handler re-reads the execution, so this payload only says why it woke. */
	async resume(agentRun: RelatedAgentRun, status: string): Promise<void> {
		// Another main, or an earlier attempt, may have resumed the run already.
		const checkpoint = await this.checkpointStorage.getStatus(agentRun.runId, agentRun.agentId);
		if (checkpoint.status !== 'active' || checkpoint.checkpoint.status !== 'suspended') return;
		const resumeData = { type: 'workflow_finished', value: status };

		if (agentRun.integrationType === N8N_CHAT_INTEGRATION_TYPE) {
			await this.resumeInPreviewChat(agentRun, resumeData);
			return;
		}

		if (!agentRun.integrationType) {
			this.logger.debug('Skipping agent resume for a run with no chat surface', {
				agentId: agentRun.agentId,
				runId: agentRun.runId,
			});
			return;
		}

		const persistence = checkpoint.checkpoint.persistence;
		if (!persistence) return;
		const route = await this.getIntegrationResumeRoute(
			agentRun,
			agentRun.integrationType,
			persistence,
		);
		if (!route) return;
		const { integrationType, credentialId, messageContext, allowLegacyThreadId } = route;
		const bridge = this.chatIntegrationService.getBridge(
			agentRun.agentId,
			integrationType,
			credentialId,
		);
		if (!bridge) {
			// The checkpoint stays suspended and the suspension card stays clickable,
			// so the run is recoverable once the integration reconnects.
			this.logger.warn('No live chat bridge to resume the agent run into', {
				agentId: agentRun.agentId,
				integrationType,
				credentialId,
				runId: agentRun.runId,
			});
			return;
		}

		await bridge.resumeInAgentThread(
			agentRun.threadId,
			agentRun.runId,
			agentRun.toolCallId,
			resumeData,
			{ messageContext, allowLegacyThreadId },
		);
	}

	/**
	 * The preview's SSE stream closed when the run suspended, so there is nothing to
	 * stream into: draining headlessly is what records the turn, and the push then
	 * tells an open chat to re-read it.
	 */
	private async resumeInPreviewChat(agentRun: RelatedAgentRun, resumeData: unknown): Promise<void> {
		// The draft version gates node and workflow tools by the user's access, so
		// without the user those tools drop and the pending tool call fails to resume.
		const user = agentRun.userId
			? await this.userRepository.findOneBy({ id: agentRun.userId })
			: null;
		if (!user) {
			this.logger.warn('Cannot resume preview chat run without its user', {
				agentId: agentRun.agentId,
				runId: agentRun.runId,
				userId: agentRun.userId,
			});
			return;
		}

		const result = await this.agentTestRunService.resumeDraftRun({
			agentId: agentRun.agentId,
			projectId: agentRun.projectId,
			sessionId: agentRun.threadId,
			runId: agentRun.runId,
			toolCallId: agentRun.toolCallId,
			resumeData,
			user,
			previewChat: agentRun.previewChat,
			response: '',
		});

		// `suspended` is chained HITL — recorded either way; anything else never ran.
		if (result.status !== 'completed' && result.status !== 'suspended') {
			this.logger.warn('Preview chat run could not be resumed', {
				agentId: agentRun.agentId,
				runId: agentRun.runId,
				status: result.status,
			});
			return;
		}

		this.executionUpdateBroadcaster.notify({
			projectId: agentRun.projectId,
			agentId: agentRun.agentId,
			threadId: agentRun.threadId,
			executionId: result.executionId ?? '',
		});
	}

	private async getIntegrationResumeRoute(
		agentRun: RelatedAgentRun,
		integrationType: string,
		persistence: NonNullable<ToolContext['persistence']>,
	) {
		let messageContext = readIntegrationMessageContext(persistence);
		const allowLegacyThreadId = messageContext === undefined;
		if (messageContext === undefined) {
			messageContext = await this.loadLegacyMessageContext(persistence.threadId, agentRun.runId);
		}
		const [platform, credentialId] = messageContext?.integrationConnectionId.split(':') ?? [];
		if (allowLegacyThreadId) {
			if (messageContext?.platform === integrationType && platform === integrationType) {
				return { integrationType, credentialId, messageContext, allowLegacyThreadId };
			}
			return {
				integrationType,
				credentialId: undefined,
				messageContext: null,
				allowLegacyThreadId,
			};
		}
		if (!messageContext || messageContext.platform !== platform || !credentialId) {
			this.logger.warn('Agent resume has no integration reply context', {
				agentId: agentRun.agentId,
				runId: agentRun.runId,
			});
			return undefined;
		}
		return {
			integrationType: messageContext.platform,
			credentialId,
			messageContext,
			allowLegacyThreadId,
		};
	}

	private async loadLegacyMessageContext(threadId: string, runId: string) {
		try {
			return await this.messageContextService.getLatest(threadId);
		} catch (error) {
			this.logger.warn('Could not read the thread message context for an agent resume', {
				runId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}
}
