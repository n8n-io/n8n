import type { AgentMessage, AgentSchema, StreamChunk } from '@n8n/agents';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { z } from 'zod';

import {
	AgentChatMessageDto,
	AgentIntegrationDto,
	CreateAgentDto,
	UpdateAgentDto,
} from './agents.dto';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsBuilderService } from './agents-builder.service';
import { AgentsCredentialProvider } from './agents-credential-provider';
import { AgentsService } from './agents.service';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';

type FlushableResponse = Response & { flush?: () => void };

const updateSchemaBody = z.object({
	schema: z.object({
		model: z.object({
			provider: z.string().nullable(),
			name: z.string().nullable(),
			raw: z.string().optional(),
		}),
		credential: z.string().nullable(),
		instructions: z.string().nullable(),
		description: z.string().nullable(),
		tools: z.array(z.record(z.unknown())),
		providerTools: z.array(z.record(z.unknown())),
		memory: z.record(z.unknown()).nullable(),
		evaluations: z.array(z.record(z.unknown())),
		guardrails: z.array(z.record(z.unknown())),
		mcp: z.array(z.record(z.unknown())).nullable(),
		telemetry: z.record(z.unknown()).nullable(),
		checkpoint: z.enum(['memory']).nullable(),
		config: z.record(z.unknown()),
	}),
	updatedAt: z.string(),
});

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
			events.push({ toolCall: { tool: part.toolName, input: part.input } });
		} else if (part.type === 'tool-result' && 'toolName' in part) {
			events.push({ toolResult: { tool: part.toolName, output: part.result } });
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
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentRepository: AgentRepository,
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
	async list(req: AuthenticatedRequest<{ projectId: string }, {}, {}, { all?: string }>) {
		// ?all=true returns all agents for this user (cross-project, for Instance AI switcher)
		if (req.query.all === 'true') {
			return await this.agentsService.findByUser(req.user.id);
		}
		return await this.agentsService.findByProjectId(req.params.projectId);
	}

	@Get('/:agentId/schema')
	async getSchema(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			this.credentialsFinderService,
			req.user,
		);
		return await this.agentsService.getSchema(agentId, projectId, credentialProvider);
	}

	@Patch('/:agentId/schema')
	async patchSchema(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const { schema, updatedAt } = updateSchemaBody.parse(req.body);
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			this.credentialsFinderService,
			req.user,
		);
		return await this.agentsService.updateSchema(
			agentId,
			projectId,
			// Zod validates the shape at runtime; the inferred type is too loose for AgentSchema
			schema as unknown as AgentSchema,
			updatedAt,
			credentialProvider,
		);
	}

	@Get('/:agentId/credentials')
	async listCredentials(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			this.credentialsFinderService,
			req.user,
		);
		return await credentialProvider.list();
	}

	@Get('/catalog/models')
	async getModelCatalog() {
		const { fetchProviderCatalog } = await import('@n8n/agents');
		return await fetchProviderCatalog();
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
		const { code, name, updatedAt, description } = payload;
		let agent = await this.agentsService.findById(agentId, req.params.projectId);

		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		if (name !== undefined) {
			agent = await this.agentsService.updateName(agentId, req.params.projectId, name);
		}

		let schemaError: string | null = null;
		if (code !== undefined) {
			const result = await this.agentsService.updateCode(
				agentId,
				req.params.projectId,
				code,
				updatedAt,
			);
			if (result) {
				agent = result.agent;
				schemaError = result.schemaError;
			}
		}

		if (description !== undefined && agent) {
			// Use the latest updatedAt from previous saves (code/name), not the original
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

		if (schemaError) {
			return { ...agent, schemaError };
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

	@Post('/:agentId/chat', { usesTemplates: true })
	async chat(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		const { message } = payload;

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			this.credentialsFinderService,
			req.user,
		);

		const send = initSseResponse(res);

		try {
			for await (const chunk of this.agentsService.executeForChat(
				agentId,
				message,
				`test-${agentId}`,
				req.user.id,
				projectId,
				credentialProvider,
			)) {
				this.sendStreamChunk(chunk, send);
			}
			send({ done: true });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Chat failed';
			send({ error: errorMessage });
		}

		res.end();
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

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			this.credentialsFinderService,
			req.user,
		);

		const send = initSseResponse(res);

		try {
			// Track streaming tool call input for set_code eager input streaming
			let streamingToolName: string | undefined;

			for await (const chunk of this.agentsBuilderService.buildAgent(
				agentId,
				projectId,
				message,
				credentialProvider,
				req.user.id,
			)) {
				if (chunk.type === 'tool-call-delta') {
					// Track which tool is streaming
					if (chunk.name) {
						streamingToolName = chunk.name;
					}
					// Stream code deltas for the set_code tool (eager input streaming)
					if (streamingToolName === 'set_code' && chunk.argumentsDelta) {
						send({ codeDelta: chunk.argumentsDelta });
					}
				} else if (chunk.type === 'message' && 'message' in chunk) {
					const events = extractMessageEvents(chunk.message);
					for (const event of events) {
						send(event);
						// After set_code tool result, fetch the updated code from DB
						if ('toolResult' in event) {
							const toolResult = event.toolResult as { tool?: string };
							if (toolResult.tool === 'set_code') {
								const updated = await this.agentsService.findById(agentId, projectId);
								if (updated) {
									send({ code: updated.code });
								}
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
			send({ error: errorMessage });
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

		const webRequest = new globalThis.Request(url, {
			method: req.method,
			headers: req.headers as Record<string, string>,
			body: requestBody,
		});

		// In Express, background tasks just need to not be garbage collected.
		// We hold references to keep them alive for the lifetime of the process.
		const backgroundTasks: Array<Promise<unknown>> = [];
		const waitUntil = (task: Promise<unknown>) => {
			backgroundTasks.push(task.catch(() => undefined));
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
			case 'message':
				for (const event of extractMessageEvents(chunk.message)) {
					send(event);
				}
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
