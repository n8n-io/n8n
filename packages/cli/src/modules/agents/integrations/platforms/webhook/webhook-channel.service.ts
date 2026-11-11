import {
	isDraftIntegration,
	WEBHOOK_INTEGRATION_TYPE,
	webhookAuthentication,
	webhookCredentialType,
	type AgentIntegrationConfig,
	type AgentWebhookIntegrationConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { NodeHelpers, type INodeParameters } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { CredentialsHelper } from '@/credentials-helper';

import { AgentChatExecutionService } from '../../../agent-chat-execution.service';
import { AgentExecutionOrchestratorService } from '../../../agent-execution-orchestrator.service';
import { AgentExecutionService } from '../../../agent-execution.service';
import { hashAgentSandboxPrincipal } from '../../../agent-sandbox-principal';
import { AgentTurnAlreadyRunningError } from '../../../agent-turn-already-running.error';
import { AgentsSettingsService } from '../../../agents-settings.service';
import type { ProjectAgent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';
import type { AgentExecutionStreamChunk } from '../../../types/agent-steering';
import { integrationMemoryResourceId } from '../../../utils/agent-memory-scope';
import { isApprovalSuspendPayload } from '../../agent-chat-suspension-cards';
import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { parseResponsesRequest, toResponseBody, WebhookChannelError } from './responses-api';
import { authenticateWebhookRequest } from './webhook-auth';

const MAX_LOGGED_ERROR_LENGTH = 500;

/** A model that keeps calling actions that need approval stops after this many declines. */
const MAX_APPROVAL_DECLINES = 5;

export interface WebhookChannelReply {
	status: number;
	body: unknown;
}

/**
 * Runs the published agent for one webhook request and returns the reply. The
 * run has no queue: the caller holds the connection, and the admission check
 * rejects a second turn while one runs in the same conversation.
 */
@Service()
export class WebhookChannelService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly settings: AgentsSettingsService,
		private readonly executionService: AgentExecutionService,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly chatExecution: AgentChatExecutionService,
		private readonly credentials: AgentCredentialLookupService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly logger: Logger,
	) {}

	async respond(request: {
		agentId: string;
		headers: Readonly<Record<string, string | string[] | undefined>>;
		body: unknown;
		abortSignal: AbortSignal;
	}): Promise<WebhookChannelReply> {
		const createdAt = new Date();
		try {
			const { agent, channel } = await this.findChannel(request.agentId);
			await this.authenticate(agent, channel, request.headers);
			const { input, conversationId } = parseResponsesRequest(request.body);
			const conversation = await this.resolveConversation(agent.id, conversationId);
			const text = await this.run(agent, input, conversation, request.abortSignal);
			return {
				status: 200,
				body: toResponseBody({
					conversationId: conversation.id,
					text,
					createdAt,
				}),
			};
		} catch (error) {
			// The caller left, so nothing reads the reply, and the abort is not a failure.
			if (request.abortSignal.aborted) return { status: 500, body: null };
			const channelError = this.toChannelError(error);
			return { status: channelError.status, body: channelError.toBody() };
		}
	}

	private async findChannel(agentId: string) {
		const agent = await this.agentRepository.findById(agentId);
		const channel = agent?.integrations?.find(
			(entry: AgentIntegrationConfig): entry is AgentWebhookIntegrationConfig =>
				entry.type === WEBHOOK_INTEGRATION_TYPE && !isDraftIntegration(entry),
		);
		if (
			!agent ||
			agent.activeVersionId === null ||
			!channel ||
			!(await this.settings.getEnabled())
		) {
			throw new WebhookChannelError(404, 'agent_not_found', 'No published agent with this URL');
		}
		return { agent, channel };
	}

	private async authenticate(
		agent: ProjectAgent,
		channel: AgentWebhookIntegrationConfig,
		headers: Readonly<Record<string, string | string[] | undefined>>,
	) {
		const authentication = webhookAuthentication(channel);
		if (authentication === 'none') return;
		const credentialType = webhookCredentialType(channel.settings);
		const credential =
			credentialType &&
			(await this.credentials.decryptForProject(
				agent.projectId,
				channel.credentialId,
				credentialType,
			));
		if (!authentication || !credential) {
			// A deleted credential, or one of another type: no request may pass.
			throw new WebhookChannelError(
				500,
				'credential_unavailable',
				'The webhook credential is missing',
			);
		}
		authenticateWebhookRequest(
			headers,
			authentication,
			this.withDefaults(credentialType, credential as INodeParameters),
		);
	}

	/** Stored credential data leaves out the fields that keep their default, such as the JWT algorithm. */
	private withDefaults(credentialType: string, data: INodeParameters) {
		const properties = this.credentialsHelper.getCredentialsProperties(credentialType);
		return NodeHelpers.getNodeParameters(properties, data, true, false, null, null) ?? data;
	}

	private async resolveConversation(agentId: string, conversationId: string | undefined) {
		const id = conversationId ?? randomUUID();
		// The agent and channel prefix keeps a caller out of the threads of other agents and channels.
		const threadId = `${agentId}:${WEBHOOK_INTEGRATION_TYPE}:${id}`;
		if (conversationId && !(await this.executionService.findThreadById(threadId))) {
			throw new WebhookChannelError(
				404,
				'conversation_not_found',
				'Unknown conversation',
				'conversation',
			);
		}
		return { id, threadId, sessionMode: conversationId ? ('existing' as const) : ('new' as const) };
	}

	/** Runs the turn and returns the text after the last tool call, the agent's answer. */
	private async run(
		agent: ProjectAgent,
		input: string,
		conversation: { id: string; threadId: string; sessionMode: 'new' | 'existing' },
		abortSignal: AbortSignal,
	): Promise<string> {
		const memory = {
			threadId: conversation.threadId,
			// The `integration:` resource scopes memory to the conversation and keeps episodic memory off.
			resourceId: integrationMemoryResourceId(WEBHOOK_INTEGRATION_TYPE, conversation.id),
		};
		let stream = this.orchestrator.executeForChatPublished({
			agentId: agent.id,
			projectId: agent.projectId,
			message: input,
			memory,
			integrationType: WEBHOOK_INTEGRATION_TYPE,
			sessionMode: conversation.sessionMode,
			sandboxPrincipalHash: hashAgentSandboxPrincipal({
				type: 'project-session',
				projectId: agent.projectId,
				sessionId: conversation.threadId,
			}),
			// A background job wake has no way to reach the caller.
			allowBackgroundTasks: false,
			abortSignal,
		});

		for (let declines = 0; ; declines++) {
			const { text, suspension } = await this.readSegment(stream);
			if (!suspension) return text;
			if (
				!isApprovalSuspendPayload(suspension.suspendPayload) ||
				declines === MAX_APPROVAL_DECLINES
			) {
				await this.cancelSuspension(agent.id, conversation.threadId);
				throw new WebhookChannelError(
					500,
					'input_not_supported',
					'The agent waits for input that the webhook channel cannot give',
				);
			}
			// Nobody can approve on the webhook, so the action is declined. The reason tells the
			// agent why, so it can answer without the action and explain it.
			stream = this.orchestrator.resumeForChat({
				agentId: agent.id,
				projectId: agent.projectId,
				runId: suspension.runId,
				toolCallId: suspension.toolCallId,
				resumeData: {
					approved: false,
					reason: 'approval is not available on this channel, so nobody can approve it',
				},
				integrationType: WEBHOOK_INTEGRATION_TYPE,
				expectedMemory: memory,
				allowBackgroundTasks: false,
				abortSignal,
			});
		}
	}

	/** Reads one run segment: the text after its last tool call, and its first suspension. */
	private async readSegment(stream: AsyncIterable<AgentExecutionStreamChunk>) {
		let text = '';
		let suspension: Extract<AgentExecutionStreamChunk, { type: 'tool-call-suspended' }> | undefined;
		for await (const chunk of stream) {
			// `respond` maps the error, after it checks whether the caller left.
			if (chunk.type === 'error') throw ensureError(chunk.error);
			if (chunk.type === 'tool-call-suspended') suspension ??= chunk;
			if (chunk.type === 'tool-call') text = '';
			if (chunk.type === 'text-delta') text += chunk.delta;
		}
		return { text, suspension };
	}

	/** Cancels the parked run, so the next turn in the conversation is not blocked. */
	private async cancelSuspension(agentId: string, threadId: string) {
		const execution = await this.executionService.findLatestSuspendedRun(threadId);
		if (execution)
			await this.chatExecution.cancelSessionSuspension(agentId, threadId, execution.id);
	}

	private agentError(error: unknown) {
		// A provider error can carry secrets, for example in a request URL.
		this.logger.error('Webhook agent turn failed', {
			error: sanitizeErrorDetail(ensureError(error).message, MAX_LOGGED_ERROR_LENGTH),
		});
		return new WebhookChannelError(500, 'agent_error', 'The agent could not answer');
	}

	private toChannelError(error: unknown): WebhookChannelError {
		if (error instanceof WebhookChannelError) return error;
		if (error instanceof AgentTurnAlreadyRunningError) {
			return new WebhookChannelError(409, 'conversation_busy', error.message, 'conversation');
		}
		return this.agentError(error);
	}
}
