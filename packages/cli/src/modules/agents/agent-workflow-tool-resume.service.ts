import { Logger } from '@n8n/backend-common';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { UserRepository } from '@n8n/db';
import { OnLifecycleEvent, OnPubSubEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { RelatedAgentRun } from 'n8n-workflow';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentTestRunService } from './agent-test-run.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';

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
	) {
		this.logger = this.logger.scoped('agents');
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	async handleWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext): Promise<void> {
		const agentRun = ctx.runData.data.parentAgentRun;
		if (!agentRun) return; // Not a sub-execution started by an agent workflow tool.
		// Parked at a Wait node, so the workflow has not finished.
		if (ctx.runData.status === 'waiting') return;

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

	/** Never let a failed agent resume disturb the execution that triggered it. */
	private async resumeSafely(agentRun: RelatedAgentRun, status: string): Promise<void> {
		try {
			await this.resume(agentRun, status);
		} catch (error) {
			this.logger.error('Failed to resume agent run after sub-workflow completed', {
				agentId: agentRun.agentId,
				runId: agentRun.runId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** The tool handler re-reads the execution, so this payload only says why it woke. */
	async resume(agentRun: RelatedAgentRun, status: string): Promise<void> {
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

		// Reply through the connection the thread actually came in on. An agent with
		// two connections on one platform would otherwise post into whichever
		// workspace happened to be found first.
		const credentialId = await this.originatingCredentialId(agentRun);
		const bridge = this.chatIntegrationService.getBridge(
			agentRun.agentId,
			agentRun.integrationType,
			credentialId,
		);
		if (!bridge) {
			// The checkpoint stays suspended and the suspension card stays clickable,
			// so the run is recoverable once the integration reconnects.
			this.logger.warn('No live chat bridge to resume the agent run into', {
				agentId: agentRun.agentId,
				integrationType: agentRun.integrationType,
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
		);
	}

	/**
	 * The credential of the connection this thread last exchanged a message on, as
	 * recorded in the thread's message context. Undefined when unknown, which
	 * leaves the lookup to fall back to any ingress bridge for the platform.
	 */
	private async originatingCredentialId(agentRun: RelatedAgentRun): Promise<string | undefined> {
		try {
			const context = await this.messageContextService.getLatest(agentRun.threadId);
			if (!context || context.platform !== agentRun.integrationType) return undefined;
			// `integrationConnectionId` is `type` alone for a single-connection agent,
			// or `type:credentialId` once a credential is bound.
			const [, credentialId] = context.integrationConnectionId.split(':');
			return credentialId;
		} catch (error) {
			this.logger.warn('Could not read the thread message context for an agent resume', {
				runId: agentRun.runId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
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
}
