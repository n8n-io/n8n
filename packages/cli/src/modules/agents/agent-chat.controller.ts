import {
	AgentChatMessageDto,
	type AgentChatMessagesResponse,
	AgentChatResumeDto,
	N8N_CHAT_INTEGRATION_TYPE,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { randomUUID } from 'crypto';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import { messagesToDto } from './agent-message-mapper';
import { type FlushableResponse, initSseStream, pumpChunks } from './agent-sse-stream';
import { AgentTestChatService, chatThreadId } from './agent-test-chat.service';
import { AgentValidationService } from './agent-validation.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import { withOpenSuspensions } from './utils/messages-envelope';

@RestController('/projects/:projectId/agents/v2')
export class AgentChatController {
	constructor(
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
		private readonly agentTestChatService: AgentTestChatService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly credentialsService: CredentialsService,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly agentsService: AgentsService,
	) {}

	@Post('/:agentId/chat', { usesTemplates: true })
	@ProjectScope('agent:execute')
	async chat(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		const { message, sessionId } = payload;

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
		);

		const { send } = initSseStream(res);

		// If the client supplied a sessionId and a thread already exists under that id,
		// the thread must belong to this (project, agent). Otherwise a caller could
		// append messages to another user's thread. A non-existent id is fine -
		// executeForChat will create the thread on first persisted message.
		if (sessionId) {
			const existing = await this.agentExecutionService.findThreadById(sessionId);
			if (existing && !threadBelongsTo(existing, projectId, agentId)) {
				send({ type: 'error', message: 'Session not found' });
				res.end();
				return;
			}
		}

		const threadId = sessionId ?? randomUUID();

		const { missing } = await this.agentValidationService.validateAgentIsRunnable(
			agentId,
			projectId,
			credentialProvider,
		);
		if (missing.length > 0) {
			send({
				type: 'error',
				message: 'This agent is not ready to run yet.',
				errorCode: 'agent_misconfigured',
				missing,
			});
			res.end();
			return;
		}

		try {
			const suspended = await pumpChunks(
				this.agentExecutionOrchestratorService.executeForChat({
					agentId,
					projectId,
					message,
					user: req.user,
					memory: {
						threadId,
						resourceId: draftChatMemoryResourceId(req.user.id),
					},
				}),
				send,
			);
			if (!suspended) {
				send({ type: 'done', sessionId: threadId });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Chat failed';
			send({ type: 'error', message: errorMessage });
		}

		res.end();
	}

	@Post('/:agentId/chat/resume', { usesTemplates: true })
	@ProjectScope('agent:execute')
	async chatResume(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatResumeDto,
	) {
		const { projectId } = req.params;
		const { runId, toolCallId, resumeData } = payload;
		const { send } = initSseStream(res);

		try {
			const suspended = await pumpChunks(
				this.agentExecutionOrchestratorService.resumeForChat({
					agentId,
					projectId,
					runId,
					toolCallId,
					resumeData,
					user: req.user,
					usePublishedVersion: false,
					integrationType: N8N_CHAT_INTEGRATION_TYPE,
				}),
				send,
			);
			if (!suspended) {
				send({ type: 'done' });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Resume failed';
			send({ type: 'error', message: errorMessage });
		}

		res.end();
	}

	@Get('/:agentId/chat/:threadId/messages')
	@ProjectScope('agent:read')
	async getChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		// getConversationHistory delegates to getThreadDetail, which validates
		// thread ownership against both projectId and agentId before returning
		// execution transcript data.
		const history = await this.agentExecutionOrchestratorService.getConversationHistory({
			threadId,
			projectId,
			agentId,
		});
		let checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(agentId, threadId);
		if (!history) {
			if (checkpoint) return withOpenSuspensions([], checkpoint);
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		if (!checkpoint) {
			checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(agentId, threadId, {
				includeUnscoped: true,
			});
		}
		return withOpenSuspensions(history, checkpoint, {
			appendInactiveCheckpointMessages: false,
		});
	}

	@Get('/:agentId/chat/messages')
	@ProjectScope('agent:read')
	async getTestChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const messages = await this.agentTestChatService.getTestChatMessages(agentId, req.user.id);
		const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
			agentId,
			chatThreadId(agentId, req.user.id),
		);
		return withOpenSuspensions(messagesToDto(messages), checkpoint);
	}

	@Delete('/:agentId/chat/messages')
	@ProjectScope('agent:update')
	async clearTestChatMessages(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.agentTestChatService.clearTestChatMessages(agentId, req.user.id);
		return { ok: true };
	}
}
