import type { SerializableAgentState } from '@n8n/agents';
import {
	isDraftIntegration,
	WEBHOOK_INTEGRATION_TYPE,
	webhookAuthentication,
	webhookCredentialType,
	type AgentIntegrationConfig,
	type AgentWebhookIntegrationConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { jsonParse, NodeHelpers, type INodeParameters, type JsonObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { CredentialsHelper } from '@/credentials-helper';

import { AgentChatExecutionService } from '../../../agent-chat-execution.service';
import { AgentExecutionOrchestratorService } from '../../../agent-execution-orchestrator.service';
import { AgentExecutionService } from '../../../agent-execution.service';
import { hashAgentSandboxPrincipal } from '../../../agent-sandbox-principal';
import { AgentTurnAlreadyRunningError } from '../../../agent-turn-already-running.error';
import { AgentsSettingsService } from '../../../agents-settings.service';
import type { ProjectAgent } from '../../../entities/agent.entity';
import { AgentRemoteTurnService } from '../../../queue/agent-remote-turn.service';
import {
	toResumeJson,
	type AgentWebhookDecideRequest,
	type AgentWebhookRespondRequest,
} from '../../../queue/agent-turn-request.types';
import { AgentRepository } from '../../../repositories/agent.repository';
import {
	findPendingStandardApproval,
	parseStandardApprovalSuspension,
} from '../../../standard-approval';
import type { AgentExecutionStreamChunk } from '../../../types/agent-steering';
import { integrationMemoryResourceId } from '../../../utils/agent-memory-scope';
import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { N8NCheckpointStorage } from '../../n8n-checkpoint-storage';
import {
	parseApprovalDecision,
	parseResponsesRequest,
	toResponseBody,
	WebhookChannelError,
	type WebhookApprovalRequest,
} from './responses-api';
import { authenticateWebhookRequest } from './webhook-auth';

const MAX_LOGGED_ERROR_LENGTH = 500;

export interface WebhookChannelReply {
	status: number;
	body: unknown;
	/** Seconds for the `Retry-After` header of a busy reply. */
	retryAfterSeconds?: number;
}

type WebhookHeaders = Readonly<Record<string, string | string[] | undefined>>;

interface WebhookConversation {
	id: string;
	threadId: string;
	sessionMode: 'new' | 'existing';
	memory: { threadId: string; resourceId: string };
}

type Suspension = Extract<AgentExecutionStreamChunk, { type: 'tool-call-suspended' }>;

/** A worker stores the reply as JSON, so the status and the body reach the main intact. */
const toResultJson = (reply: WebhookChannelReply): JsonObject =>
	jsonParse<JsonObject>(JSON.stringify({ status: reply.status, body: reply.body ?? null }));

const LOST_TURN_ERROR = () =>
	new WebhookChannelError(
		503,
		'agent_unavailable',
		'The agent stopped before it could answer. Send the request again.',
	);

const BUSY_ERROR = () =>
	new WebhookChannelError(
		503,
		'server_busy',
		'n8n is busy right now. Send the request again after the time in the Retry-After header.',
	);

const approvalNotFound = () =>
	new WebhookChannelError(
		404,
		'approval_not_found',
		'This approval is no longer pending. It may have expired or already been decided.',
	);

/**
 * Runs the published agent for one webhook request and returns the reply. The
 * run has no queue: the caller holds the connection, and the admission check
 * rejects a second turn while one runs in the same conversation. An action that
 * needs approval stops the run, and the reply gives a URL for the decision. New
 * input in the conversation cancels the action instead.
 *
 * In agent queue mode, the main that serves the request checks the caller and
 * the body, then an agent worker runs the turn and stores the reply. No
 * credential or header leaves the main.
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
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
		private readonly remoteTurns: AgentRemoteTurnService,
	) {
		this.remoteTurns.handle('webhook-respond', {
			mode: 'result',
			run: async (payload, { abortSignal }) =>
				toResultJson(await this.runRespond(payload, abortSignal)),
		});
		this.remoteTurns.handle('webhook-decide', {
			mode: 'result',
			run: async (payload, { abortSignal }) =>
				toResultJson(await this.runDecide(payload, abortSignal)),
		});
	}

	async respond(request: {
		agentId: string;
		headers: WebhookHeaders;
		body: unknown;
		abortSignal: AbortSignal;
	}): Promise<WebhookChannelReply> {
		let payload: AgentWebhookRespondRequest;
		try {
			const { agent, channel } = await this.findChannel(request.agentId);
			await this.authenticate(agent, channel, request.headers);
			const { input, conversationId } = parseResponsesRequest(request.body);
			payload = {
				kind: 'webhook-respond',
				agentId: agent.id,
				input,
				conversationId,
				approvalBaseUrl: this.urlService.getAgentWebhookUrl(agent.id),
			};
		} catch (error) {
			return this.errorReply(request.abortSignal, error);
		}
		return await this.dispatch(
			payload,
			request.abortSignal,
			async () => await this.runRespond(payload, request.abortSignal),
		);
	}

	/** Runs one webhook message in this process. The caller is already authenticated. */
	async runRespond(
		payload: AgentWebhookRespondRequest,
		abortSignal: AbortSignal,
	): Promise<WebhookChannelReply> {
		const { input, conversationId, approvalBaseUrl } = payload;
		return await this.reply(abortSignal, approvalBaseUrl, async () => {
			const agent = await this.findPublishedAgent(payload.agentId);
			const conversation = await this.resolveConversation(agent.id, conversationId);
			// A caller that lost the reply has no approval URL, so new input drops the waiting action.
			// The next history load marks the action as not done.
			if (conversation.sessionMode === 'existing') {
				await this.cancelSuspension(agent.id, conversation.threadId);
			}
			const stream = this.orchestrator.executeForChatPublished({
				agentId: agent.id,
				projectId: agent.projectId,
				message: input,
				memory: conversation.memory,
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
			return {
				agent,
				conversation,
				// Admission also rejects new input while the run waits for a decision.
				stream: this.mapAdmissionError(stream, async (error) =>
					error instanceof AgentTurnAlreadyRunningError &&
					(await this.checkpointStorage.findSuspendedForThread(agent.id, conversation.threadId))
						? new WebhookChannelError(
								409,
								'approval_pending',
								'An action in this conversation waits for approval. Send a decision to its approval URL first.',
								'conversation',
							)
						: undefined,
				),
			};
		});
	}

	/** Resumes the run with the caller's decision on one approval request. */
	async decide(request: {
		agentId: string;
		conversationId: string;
		runId: string;
		toolCallId: string;
		headers: WebhookHeaders;
		body: unknown;
		abortSignal: AbortSignal;
	}): Promise<WebhookChannelReply> {
		let payload: AgentWebhookDecideRequest;
		try {
			const { agent, channel } = await this.findChannel(request.agentId);
			await this.authenticate(agent, channel, request.headers);
			payload = {
				kind: 'webhook-decide',
				agentId: agent.id,
				conversationId: request.conversationId,
				runId: request.runId,
				toolCallId: request.toolCallId,
				decision: toResumeJson(parseApprovalDecision(request.body)),
				approvalBaseUrl: this.urlService.getAgentWebhookUrl(agent.id),
			};
		} catch (error) {
			return this.errorReply(request.abortSignal, error);
		}
		return await this.dispatch(
			payload,
			request.abortSignal,
			async () => await this.runDecide(payload, request.abortSignal),
		);
	}

	/** Runs one approval decision in this process. The caller is already authenticated. */
	async runDecide(
		payload: AgentWebhookDecideRequest,
		abortSignal: AbortSignal,
	): Promise<WebhookChannelReply> {
		return await this.reply(abortSignal, payload.approvalBaseUrl, async () => {
			const agent = await this.findPublishedAgent(payload.agentId);
			const conversation = await this.resolveConversation(agent.id, payload.conversationId);
			// The main parsed the decision, so this parse only restores its type.
			const decision = parseApprovalDecision(payload.decision);
			const { runId, toolCallId } = payload;
			const pending = { agentId: agent.id, conversation, runId, toolCallId };
			const approval = await this.findPendingApproval(pending);
			if (!approval) throw approvalNotFound();
			if (decision.scope === 'session' && approval.supportsSessionApproval !== true) {
				throw new WebhookChannelError(
					400,
					'invalid_request',
					'This action cannot be approved for the session',
					'scope',
				);
			}
			const stream = this.orchestrator.resumeForChat({
				agentId: agent.id,
				projectId: agent.projectId,
				runId,
				toolCallId,
				resumeData: decision,
				integrationType: WEBHOOK_INTEGRATION_TYPE,
				// The resume rejects a run of another conversation.
				expectedMemory: conversation.memory,
				allowBackgroundTasks: false,
				abortSignal,
			});
			return {
				agent,
				conversation,
				// The checkpoint can expire or be decided after the check above. Other
				// errors, such as a runtime that cannot be built, stay agent errors.
				stream: this.mapAdmissionError(stream, async (error) =>
					error instanceof UserError &&
					!(error instanceof AgentTurnAlreadyRunningError) &&
					!(await this.findPendingApproval(pending))
						? approvalNotFound()
						: undefined,
				),
			};
		});
	}

	/**
	 * Runs the turn on an agent worker when one is up, else in this process. A
	 * worker that leaves before it stores the reply gives a 503, because the
	 * turn runs at most once.
	 */
	private async dispatch(
		payload: AgentWebhookRespondRequest | AgentWebhookDecideRequest,
		abortSignal: AbortSignal,
		runHere: () => Promise<WebhookChannelReply>,
	): Promise<WebhookChannelReply> {
		const remote = await this.remoteTurns.result(payload, abortSignal);
		switch (remote.outcome) {
			case 'local':
				return await runHere();
			case 'done':
				return { status: Number(remote.result.status), body: remote.result.body ?? null };
			case 'left':
				return { status: 500, body: null };
			case 'lost':
				return this.errorReply(abortSignal, LOST_TURN_ERROR());
			case 'busy':
				return {
					...this.errorReply(abortSignal, BUSY_ERROR()),
					retryAfterSeconds: remote.retryAfterSeconds,
				};
		}
	}

	private errorReply(abortSignal: AbortSignal, error: unknown): WebhookChannelReply {
		// The caller left, so nothing reads the reply, and the abort is not a failure.
		if (abortSignal.aborted) return { status: 500, body: null };
		const channelError = this.toChannelError(error);
		return { status: channelError.status, body: channelError.toBody() };
	}

	/** Reads the run that `start` begins or resumes, and renders the reply or the error. */
	private async reply(
		abortSignal: AbortSignal,
		approvalBaseUrl: string,
		start: () => Promise<{
			agent: ProjectAgent;
			conversation: WebhookConversation;
			stream: AsyncIterable<AgentExecutionStreamChunk>;
		}>,
	): Promise<WebhookChannelReply> {
		const createdAt = new Date();
		try {
			const { agent, conversation, stream } = await start();
			const { text, approvals } = await this.finishTurn(
				agent.id,
				conversation,
				stream,
				approvalBaseUrl,
			);
			return {
				status: 200,
				body: toResponseBody({
					conversationId: conversation.id,
					text,
					approvals,
					createdAt,
				}),
			};
		} catch (error) {
			return this.errorReply(abortSignal, error);
		}
	}

	/** The main checked the channel. A worker only checks that the agent is still published. */
	private async findPublishedAgent(agentId: string): Promise<ProjectAgent> {
		const agent = await this.agentRepository.findById(agentId);
		if (!agent || agent.activeVersionId === null) {
			throw new WebhookChannelError(404, 'agent_not_found', 'No published agent with this URL');
		}
		return agent;
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
		headers: WebhookHeaders,
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

	private async resolveConversation(
		agentId: string,
		conversationId: string | undefined,
	): Promise<WebhookConversation> {
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
		return {
			id,
			threadId,
			sessionMode: conversationId ? 'existing' : 'new',
			memory: {
				threadId,
				// The `integration:` resource scopes memory to the conversation and keeps episodic memory off.
				resourceId: integrationMemoryResourceId(WEBHOOK_INTEGRATION_TYPE, id),
			},
		};
	}

	/**
	 * Reads the run to its end or its suspension. It returns the text after the
	 * last tool call, the agent's answer, and one approval request for each
	 * action that waits for a decision.
	 */
	private async finishTurn(
		agentId: string,
		conversation: WebhookConversation,
		stream: AsyncIterable<AgentExecutionStreamChunk>,
		approvalBaseUrl: string,
	): Promise<{ text: string; approvals: WebhookApprovalRequest[] }> {
		const { text, suspensions } = await this.readSegment(stream);
		const approvals: WebhookApprovalRequest[] = [];
		for (const suspension of suspensions) {
			const payload = parseStandardApprovalSuspension(suspension);
			if (!payload) {
				await this.cancelSuspension(agentId, conversation.threadId);
				throw new WebhookChannelError(
					500,
					'input_not_supported',
					'The agent waits for input that the webhook channel cannot give',
				);
			}
			approvals.push({
				toolCallId: suspension.toolCallId,
				payload,
				url: [
					approvalBaseUrl,
					'approvals',
					...[conversation.id, suspension.runId, suspension.toolCallId].map(encodeURIComponent),
				].join('/'),
			});
		}
		return { text, approvals };
	}

	/** Reads one run segment: the text after its last tool call, and all its suspensions. */
	private async readSegment(stream: AsyncIterable<AgentExecutionStreamChunk>) {
		let text = '';
		const suspensions: Suspension[] = [];
		for await (const chunk of stream) {
			// `reply` maps the error, after it checks whether the caller left.
			if (chunk.type === 'error') throw ensureError(chunk.error);
			if (chunk.type === 'tool-call-suspended') suspensions.push(chunk);
			if (chunk.type === 'tool-call') text = '';
			if (chunk.type === 'text-delta') text += chunk.delta;
		}
		return { text, suspensions };
	}

	/**
	 * Returns the approval that waits at this URL. Only a standard approval of
	 * this conversation qualifies, so the URL cannot resume other input.
	 */
	private async findPendingApproval({
		agentId,
		conversation,
		runId,
		toolCallId,
	}: {
		agentId: string;
		conversation: WebhookConversation;
		runId: string;
		toolCallId: string;
	}) {
		let checkpoint: SerializableAgentState | undefined;
		try {
			checkpoint = await this.checkpointStorage.load(runId, agentId);
		} catch (error) {
			// The run expired or was already handled.
			if (!(error instanceof UserError)) throw error;
		}
		return findPendingStandardApproval(checkpoint, { runId, toolCallId, ...conversation.memory });
	}

	/**
	 * Lets `map` replace an error that the run throws before its first chunk.
	 * Those errors come from the admission and checkpoint checks, not from the
	 * agent, so they can get a precise status.
	 */
	private async *mapAdmissionError(
		stream: AsyncIterable<AgentExecutionStreamChunk>,
		map: (error: unknown) => Promise<WebhookChannelError | undefined>,
	): AsyncIterable<AgentExecutionStreamChunk> {
		let started = false;
		try {
			for await (const chunk of stream) {
				started = true;
				yield chunk;
			}
		} catch (error) {
			const mapped = started ? undefined : await map(error);
			if (mapped) throw mapped;
			throw error;
		}
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
