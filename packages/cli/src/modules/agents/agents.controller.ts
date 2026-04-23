import type { AgentMessage, StreamChunk } from '@n8n/agents';
import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Put, RestController } from '@n8n/decorators';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import {
	AgentChatMessageDto,
	AgentIntegrationDto,
	CreateAgentDto,
	UpdateAgentConfigDto,
	UpdateAgentDto,
} from './agents.dto';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';

type FlushableResponse = Response & { flush?: () => void };

/**
 * Extract SSE-sendable events from AgentMessage content parts.
 * Returns an array of event objects suitable for `send()`.
 */
function extractMessageEvents(message: AgentMessage): Array<Record<string, unknown>> {
	if (!('content' in message) || !Array.isArray(message.content)) return [];

	const events: Array<Record<string, unknown>> = [];
	for (const part of message.content) {
		if (part.type === 'text' && 'text' in part) {
			events.push({ text: part.text });
		} else if (part.type === 'tool-call' && 'toolName' in part) {
			const toolCallId =
				'toolCallId' in part && typeof part.toolCallId === 'string' ? part.toolCallId : undefined;
			events.push({ toolCall: { tool: part.toolName, toolCallId, input: part.input } });
		} else if (part.type === 'tool-result' && 'toolName' in part) {
			const toolCallId =
				'toolCallId' in part && typeof part.toolCallId === 'string' ? part.toolCallId : undefined;
			events.push({ toolResult: { tool: part.toolName, toolCallId, output: part.result } });
		}
	}
	return events;
}

/**
 * Set up SSE headers and return a send helper for streaming responses.
 */
function initSseResponse(res: FlushableResponse): (data: Record<string, unknown>) => void {
	res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no');
	res.flushHeaders();
	(res.socket as { setNoDelay?: (v: boolean) => void })?.setNoDelay?.(true);

	return (data: Record<string, unknown>) => {
		res.write(`data: ${JSON.stringify(data)}\n\n`);
		res.flush?.();
	};
}

@RestController('/projects/:projectId/agents/v2')
export class AgentsController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly credentialsService: CredentialsService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentRepository: AgentRepository,
		private readonly agentExecutionService: AgentExecutionService,
	) {}

	@Post('/')
	async create(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateAgentDto,
	) {
		const { projectId } = req.params;

		return await this.agentsService.create(projectId, payload.name);
	}

	@Get('/')
	async list(req: AuthenticatedRequest<{ projectId: string }, unknown, unknown, { all?: string }>) {
		// ?all=true returns all agents for this user (cross-project, for Instance AI switcher)
		if (req.query.all === 'true') {
			return await this.agentsService.findByUser(req.user.id);
		}
		return await this.agentsService.findByProjectId(req.params.projectId);
	}

	@Get('/:agentId/config')
	async getConfig(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		return await this.agentsService.getConfig(agentId, projectId);
	}

	@Put('/:agentId/config')
	async putConfig(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentConfigDto,
	) {
		const { projectId } = req.params;
		const { config } = payload;
		return await this.agentsService.updateConfig(agentId, projectId, config);
	}

	@Delete('/:agentId/tools/:toolId')
	async deleteTool(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; toolId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('toolId') toolId: string,
	) {
		const { projectId } = req.params;
		await this.agentsService.deleteCustomTool(agentId, projectId, toolId);
		return { ok: true };
	}

	@Get('/:agentId/credentials')
	async listCredentials(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId } = req.params;
		const credentialProvider = new AgentsCredentialProvider(this.credentialsService, projectId);
		return await credentialProvider.list();
	}

	@Get('/catalog/models')
	async getModelCatalog() {
		const { fetchProviderCatalog } = await import('@n8n/agents');
		return await fetchProviderCatalog();
	}

	@Get('/threads')
	async listThreads(
		req: AuthenticatedRequest<
			{ projectId: string },
			{},
			{},
			{ cursor?: string; limit?: string; agentId?: string }
		>,
	) {
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		return await this.agentExecutionService.getThreads(
			req.params.projectId,
			limit,
			req.query.cursor,
			req.query.agentId,
		);
	}

	@Get('/threads/:threadId')
	async getThread(
		req: AuthenticatedRequest<
			{ projectId: string; threadId: string },
			{},
			{},
			{ agentId?: string }
		>,
	) {
		const result = await this.agentExecutionService.getThreadDetail(
			req.params.threadId,
			req.params.projectId,
			req.query.agentId,
		);
		if (!result) {
			throw new NotFoundError(`Thread "${req.params.threadId}" not found`);
		}
		return result;
	}

	@Delete('/threads/:threadId')
	async deleteThread(req: AuthenticatedRequest<{ projectId: string; threadId: string }>) {
		const { projectId, threadId } = req.params;
		const deleted = await this.agentExecutionService.deleteThread(projectId, threadId);
		if (!deleted) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return { success: true };
	}

	@Get('/:agentId')
	async get(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const agent = await this.agentsService.findById(agentId, req.params.projectId);

		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return agent;
	}

	@Patch('/:agentId')
	async update(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentDto,
	) {
		const { name, description } = payload;
		let agent = await this.agentsService.findById(agentId, req.params.projectId);

		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		if (name !== undefined) {
			agent = await this.agentsService.updateName(agentId, req.params.projectId, name);
		}

		if (description !== undefined && agent) {
			// Use the latest updatedAt from previous saves (name), not the original
			// request updatedAt, to avoid false optimistic-lock conflicts.
			const latestUpdatedAt =
				agent.updatedAt instanceof Date ? agent.updatedAt.toISOString() : agent.updatedAt;
			agent = await this.agentsService.updateDescription(
				agentId,
				req.params.projectId,
				description,
				latestUpdatedAt,
			);
		}

		return agent;
	}

	@Delete('/:agentId')
	async delete(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const deleted = await this.agentsService.delete(agentId, req.params.projectId);

		if (!deleted) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return { success: true };
	}

	@Post('/:agentId/publish')
	async publish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		return await this.agentsService.publishAgent(agentId, req.params.projectId, req.user.id);
	}

	@Post('/:agentId/unpublish')
	async unpublish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		return await this.agentsService.unpublishAgent(agentId, req.params.projectId);
	}

	@Post('/:agentId/chat', { usesTemplates: true })
	async chat(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		const { message, sessionId } = payload;

		const credentialProvider = new AgentsCredentialProvider(this.credentialsService, projectId);

		const send = initSseResponse(res);

		// If the client supplied a sessionId and a thread already exists under that id,
		// the thread must belong to this (project, agent). Otherwise a caller could
		// append messages to another user's thread. A non-existent id is fine —
		// executeForChat will create the thread on first persisted message.
		if (sessionId) {
			const existing = await this.agentExecutionService.findThreadById(sessionId);
			if (existing && !threadBelongsTo(existing, projectId, agentId)) {
				send({ error: 'Session not found' });
				res.end();
				return;
			}
		}

		const threadId = sessionId ?? randomUUID();

		const { missing } = await this.agentsService.validateAgentIsRunnable(
			agentId,
			projectId,
			credentialProvider,
		);
		if (missing.length > 0) {
			send({
				error: 'This agent is not ready to run yet.',
				errorCode: 'agent_misconfigured',
				missing,
			});
			res.end();
			return;
		}

		try {
			for await (const chunk of this.agentsService.executeForChat(
				agentId,
				message,
				threadId,
				req.user.id,
				projectId,
				credentialProvider,
				'chat',
			)) {
				this.sendStreamChunk(chunk, send);
			}
			send({ done: true, sessionId: threadId });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Chat failed';
			send({ error: errorMessage });
		}

		res.end();
	}

	@Get('/:agentId/chat/:threadId/messages')
	async getChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const thread = await this.agentExecutionService.findThreadById(threadId);
		if (!thread || !threadBelongsTo(thread, projectId, agentId)) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return await this.agentsService.getChatMessages(threadId);
	}

	@Get('/:agentId/build/messages')
	async getBuilderMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentPersistedMessageDto[]> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const messages = await this.agentsBuilderService.getBuilderMessages(agentId);
		return messages as unknown as AgentPersistedMessageDto[];
	}

	@Delete('/:agentId/build/messages')
	async clearBuilderMessages(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.agentsBuilderService.clearBuilderMessages(agentId);
		return { ok: true };
	}

	@Get('/:agentId/chat/messages')
	async getTestChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentPersistedMessageDto[]> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const messages = await this.agentsService.getTestChatMessages(agentId, req.user.id);
		return messages as unknown as AgentPersistedMessageDto[];
	}

	@Delete('/:agentId/chat/messages')
	async clearTestChatMessages(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.agentsService.clearTestChatMessages(agentId, req.user.id);
		return { ok: true };
	}

	@Post('/:agentId/build', { usesTemplates: true })
	async build(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		const { message } = payload;

		const credentialProvider = new AgentsCredentialProvider(this.credentialsService, projectId);

		const send = initSseResponse(res);

		try {
			// Track streaming tool call input for set_code eager input streaming
			let streamingToolName: string | undefined;

			for await (const chunk of this.agentsBuilderService.buildAgent(
				agentId,
				projectId,
				message,
				credentialProvider,
				req.user,
			)) {
				if (chunk.type === 'tool-call-delta') {
					// Track which tool is streaming
					if (chunk.name) {
						streamingToolName = chunk.name;
						// Announce the tool call as soon as the LLM commits to a name —
						// before args finish streaming. The FE dedupes by toolCallId
						// and fills in the full input when the tool-call message arrives.
						if (chunk.id) {
							send({ toolCall: { tool: chunk.name, toolCallId: chunk.id } });
						}
					}
					// Stream tool code deltas for build_custom_tool
					if (streamingToolName === 'build_custom_tool' && chunk.argumentsDelta) {
						send({ toolCodeDelta: chunk.argumentsDelta });
					}
				} else if (chunk.type === 'message' && 'message' in chunk) {
					const events = extractMessageEvents(chunk.message);
					for (const event of events) {
						send(event);
						if ('toolResult' in event) {
							const toolResult = event.toolResult as { tool?: string };
							if (toolResult.tool === 'write_config' || toolResult.tool === 'patch_config') {
								send({ configUpdated: true });
								streamingToolName = undefined;
							}
							if (toolResult.tool === 'build_custom_tool') {
								send({ toolUpdated: true });
								streamingToolName = undefined;
							}
						}
					}
				} else {
					this.sendStreamChunk(chunk, send);
				}
			}

			send({ done: true });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Build failed';
			const errorCode =
				error && typeof error === 'object' && 'code' in error
					? (error as { code?: unknown }).code
					: undefined;
			send({ error: errorMessage, ...(typeof errorCode === 'string' ? { code: errorCode } : {}) });
		}

		res.end();
	}

	@Post('/:agentId/integrations/connect')
	async connectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentIntegrationDto,
	) {
		const { type, credentialId } = payload;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		if (!agent.publishedVersion)
			throw new ConflictError(
				`Agent "${agentId}" must be published before connecting an integration`,
			);

		await this.chatIntegrationService.connect(
			agentId,
			credentialId,
			type,
			req.user.id,
			agent.projectId,
		);

		// Persist the integration reference on the agent
		const existing = agent.integrations ?? [];
		const alreadyExists = existing.some((i) => i.type === type && i.credentialId === credentialId);
		if (!alreadyExists) {
			agent.integrations = [...existing, { type, credentialId }];
			await this.agentRepository.save(agent);
		}

		return { status: 'connected' };
	}

	@Post('/:agentId/integrations/disconnect')
	async disconnectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentIntegrationDto,
	) {
		const { type, credentialId } = payload;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		await this.chatIntegrationService.disconnect(agentId, type, credentialId);

		// Remove the integration reference from the agent
		agent.integrations = (agent.integrations ?? []).filter(
			(i) => !(i.type === type && i.credentialId === credentialId),
		);
		await this.agentRepository.save(agent);

		return { status: 'disconnected' };
	}

	@Get('/:agentId/integrations/status')
	async integrationStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		return this.chatIntegrationService.getStatus(agentId);
	}

	@Post('/:agentId/webhooks/:platform', { skipAuth: true, allowBots: true })
	async handleWebhook(
		req: Request<{ projectId: string; agentId: string; platform: string }>,
		res: Response,
	) {
		const { agentId, platform } = req.params;
		const webhookHandler = this.chatIntegrationService.getWebhookHandler(agentId, platform);

		if (!webhookHandler) {
			res.status(404).json({ error: `No active ${platform} integration for agent "${agentId}"` });
			return;
		}

		// Chat SDK webhook handlers accept a Web API Request and return a Web API Response.
		// Convert Express req → Web Request. We must preserve the raw body exactly as
		// received because the Slack adapter verifies the request signature against it.
		// Using JSON.stringify(req.body) would break signature verification (→ 401).
		const forwardedProto = req.headers['x-forwarded-proto'];
		const protocol =
			(Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ?? req.protocol;
		const forwardedHost = req.headers['x-forwarded-host'];
		const host =
			(Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
			req.headers.host ??
			'localhost';
		const url = `${protocol}://${host}${req.originalUrl}`;

		// Get the raw body — Express may have parsed it already.
		// If rawBody is available (from rawBodyReader middleware), use it.
		// Otherwise re-encode based on content-type.
		let requestBody: string | undefined;
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			// Express augments Request with rawBody via middleware
			interface RequestWithRawBody {
				rawBody?: Buffer;
			}

			const rawBody = (req as RequestWithRawBody).rawBody;
			if (rawBody) {
				requestBody = rawBody.toString('utf-8');
			} else if (req.headers['content-type']?.includes('application/json')) {
				requestBody = JSON.stringify(req.body);
			} else if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
				requestBody = new URLSearchParams(req.body as Record<string, string>).toString();
			} else {
				requestBody = JSON.stringify(req.body);
			}
		}

		const sanitizedHeaders: Record<string, string> = {};
		for (const [key, value] of Object.entries(req.headers)) {
			if (typeof value === 'string') {
				sanitizedHeaders[key] = value;
			} else if (Array.isArray(value)) {
				sanitizedHeaders[key] = value.join(', ');
			}
		}

		const webRequest = new globalThis.Request(url, {
			method: req.method,
			headers: sanitizedHeaders,
			body: requestBody,
		});

		// In Express, background tasks just need to not be garbage collected.
		// We hold references to keep them alive for the lifetime of the process.
		const backgroundTasks: Array<Promise<unknown>> = [];
		const waitUntil = (task: Promise<unknown>) => {
			backgroundTasks.push(
				task.catch((error: unknown) => {
					console.warn(
						'[AgentsController] Background task failed:',
						error instanceof Error ? error.message : String(error),
					);
				}),
			);
		};

		const webResponse = await webhookHandler(webRequest, { waitUntil });

		res.status(webResponse.status);
		webResponse.headers.forEach((value, key) => {
			res.setHeader(key, value);
		});
		const body = await webResponse.text();
		res.send(body);
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	/**
	 * Map a single StreamChunk to an SSE event and send it.
	 * Handles text-delta, reasoning-delta, message, and error chunk types.
	 */
	private sendStreamChunk(chunk: StreamChunk, send: (data: Record<string, unknown>) => void): void {
		switch (chunk.type) {
			case 'text-delta':
				if (chunk.delta) send({ text: chunk.delta });
				break;
			case 'reasoning-delta':
				if (chunk.delta) send({ thinking: chunk.delta });
				break;
			case 'tool-call-delta':
				// Early announce: emit once when the LLM first commits to a tool
				// name, before args finish streaming. Subsequent deltas (no name)
				// are skipped here; the full input arrives with the message chunk.
				if (chunk.name && chunk.id) {
					send({ toolCall: { tool: chunk.name, toolCallId: chunk.id } });
				}
				break;
			case 'message':
				for (const event of extractMessageEvents(chunk.message)) {
					send(event);
				}
				break;
			case 'tool-execution-start':
				send({ toolCallExecuting: { toolCallId: chunk.toolCallId, tool: chunk.toolName } });
				break;
			case 'error': {
				const errMsg = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
				send({ error: errMsg });
				break;
			}
			default:
				break;
		}
	}
}
