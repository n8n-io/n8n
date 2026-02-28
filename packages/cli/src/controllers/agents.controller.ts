import {
	CreateAgentDto,
	DiscoverAgentDto,
	DispatchTaskDto,
	ExternalTaskDto,
	RegisterExternalAgentDto,
	UpdateAgentDto,
	UpdateExternalAgentMappingsDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	RestController,
	Body,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	GlobalScope,
} from '@n8n/decorators';
import type { Request, Response } from 'express';

import { validateExternalAgentUrl } from '@/agents/validate-agent-url';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { sendErrorResponse } from '@/response-helper';
import { AgentsService } from '@/services/agents/agents.service';
import type { ExternalAgentConfig } from '@/services/agents/agents.types';
import { MAX_ITERATIONS, executeTaskOverSse } from '@/services/agents/agents.types';

@RestController('/agents')
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post('/')
	@GlobalScope('agent:create')
	async createAgent(_req: AuthenticatedRequest, _res: Response, @Body payload: CreateAgentDto) {
		return await this.agentsService.createAgent(payload);
	}

	@Patch('/:agentId')
	@GlobalScope('agent:update')
	async updateAgent(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentDto,
	) {
		return await this.agentsService.updateAgent(agentId, payload);
	}

	@Delete('/:agentId')
	@GlobalScope('agent:delete')
	async deleteAgent(_req: AuthenticatedRequest, res: Response, @Param('agentId') agentId: string) {
		await this.agentsService.deleteAgent(agentId);
		res.status(204).send();
		return undefined;
	}

	@Get('/')
	@GlobalScope('agent:list')
	async listAgents(req: AuthenticatedRequest) {
		return await this.agentsService.listAgents(req.user);
	}

	// ── External Agent Registration (declared before /:agentId to avoid param conflict) ──

	@Post('/external')
	@GlobalScope('agent:create')
	async registerExternalAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: RegisterExternalAgentDto,
	) {
		return await this.agentsService.registerExternalAgent(payload.url, payload.apiKey, req.user);
	}

	@Get('/external')
	@GlobalScope('agent:list')
	async listExternalAgents() {
		return await this.agentsService.listExternalAgents();
	}

	@Patch('/external/:registrationId/mappings')
	@GlobalScope('agent:update')
	async updateExternalAgentMappings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('registrationId') registrationId: string,
		@Body payload: UpdateExternalAgentMappingsDto,
	) {
		return await this.agentsService.updateExternalAgentMappings(
			registrationId,
			payload.credentialMappings,
		);
	}

	@Delete('/external/:registrationId')
	@GlobalScope('agent:delete')
	async deleteExternalAgent(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('registrationId') registrationId: string,
	) {
		await this.agentsService.deleteExternalAgent(registrationId);
		res.status(204).send();
		return undefined;
	}

	@Get('/:agentId/capabilities')
	@GlobalScope('agent:read')
	async getCapabilities(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		return await this.agentsService.getCapabilities(agentId);
	}

	@Get('/:agentId/card', { apiKeyAuth: true, allowUnauthenticated: true })
	async getAgentCard(req: Request, _res: Response, @Param('agentId') agentId: string) {
		const baseUrl = `${req.protocol}://${req.get('host')}`;
		return await this.agentsService.getAgentCard(agentId, baseUrl);
	}

	@Post('/discover')
	@GlobalScope('agent:create')
	async discoverExternalAgent(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: DiscoverAgentDto,
	) {
		const { url, apiKey } = payload;

		// SSRF protection — skip for localhost in dev
		if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
			await validateExternalAgentUrl(url);
		}

		// Fetch the remote agent card
		const cardUrl = `${url.replace(/\/+$/, '')}/.well-known/agent.json`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);

		try {
			const response = await fetch(cardUrl, {
				headers: {
					'x-n8n-api-key': apiKey,
					Accept: 'application/json',
				},
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new BadRequestError(
					`Remote instance returned ${String(response.status)}: ${await response.text()}`,
				);
			}

			return (await response.json()) as unknown;
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new BadRequestError(`Failed to discover remote agent: ${message}`);
		} finally {
			clearTimeout(timeout);
		}
	}

	@Post('/external-task', { usesTemplates: true })
	@GlobalScope('agent:read')
	async proxyExternalTask(
		_req: AuthenticatedRequest,
		res: Response,
		@Body payload: ExternalTaskDto,
	) {
		let { apiKey } = payload;
		const { url, prompt, registrationId } = payload;

		// Resolve apiKey from registration's encrypted credential if registrationId is provided
		if (!apiKey && registrationId) {
			apiKey = await this.agentsService.resolveExternalAgentApiKey(registrationId);
		}

		if (!apiKey) {
			sendErrorResponse(res, new BadRequestError('No API key provided or resolvable'));
			return undefined;
		}

		// SSRF protection — skip for localhost in dev
		if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
			await validateExternalAgentUrl(url);
		}

		// Resolve credential mappings if this is a registered external agent.
		// Extract anthropicApi separately as the BYOK LLM key; the rest go as workflowCredentials.
		let byokCredentials:
			| { anthropicApiKey?: string; workflowCredentials?: Record<string, Record<string, string>> }
			| undefined;
		if (registrationId) {
			const resolved = await this.agentsService.resolveCredentialMappings(registrationId);
			const anthropicData = resolved.anthropicApi;
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete resolved.anthropicApi;

			const anthropicApiKey = anthropicData?.apiKey;
			const hasWorkflowCreds = Object.keys(resolved).length > 0;

			if (anthropicApiKey || hasWorkflowCreds) {
				byokCredentials = {};
				if (anthropicApiKey) byokCredentials.anthropicApiKey = anthropicApiKey;
				if (hasWorkflowCreds) byokCredentials.workflowCredentials = resolved;
			}
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 120_000);

		const requestBody: Record<string, unknown> = { prompt };
		if (byokCredentials) {
			requestBody.byokCredentials = byokCredentials;
		}

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'text/event-stream',
					'x-n8n-api-key': apiKey,
				},
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});

			if (!response.ok) {
				const text = await response.text();
				sendErrorResponse(
					res,
					new BadRequestError(`Remote agent returned ${String(response.status)}: ${text}`),
				);
				return undefined;
			}

			const contentType = response.headers.get('content-type') ?? '';

			// If remote supports SSE, pipe the stream through
			if (contentType.includes('text/event-stream') && response.body) {
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				});

				const reader = response.body.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						res.write(decoder.decode(value, { stream: true }));
					}
				} catch {
					// Stream interrupted
				} finally {
					res.end();
				}
			} else {
				// Non-streaming JSON response
				const data = await response.json();
				res.json(data);
			}
		} catch (error) {
			if (!res.headersSent) {
				const message = error instanceof Error ? error.message : String(error);
				sendErrorResponse(res, new BadRequestError(`External task failed: ${message}`));
			}
		} finally {
			clearTimeout(timeout);
		}

		return undefined;
	}

	@Post('/:agentId/task', {
		apiKeyAuth: true,
		usesTemplates: true,
		ipRateLimit: { limit: 20, windowMs: 60_000 },
		keyedRateLimit: { source: 'user' as const, limit: 10, windowMs: 60_000 },
	})
	async dispatchTask(
		req: AuthenticatedRequest,
		res: Response,
		@Param('agentId') agentId: string,
		@Body payload: DispatchTaskDto,
	) {
		try {
			await this.agentsService.enforceAccessLevel(agentId, req.user);
		} catch (error) {
			// usesTemplates bypasses the `send()` error handler, so we handle errors manually
			sendErrorResponse(res, error instanceof Error ? error : new Error(String(error)));
			return undefined;
		}

		const { prompt, externalAgents, byokCredentials, callerId } = payload;
		const byokApiKey = byokCredentials?.anthropicApiKey;
		const workflowCredentials = byokCredentials?.workflowCredentials;
		const wantsStream = req.headers.accept?.includes('text/event-stream');
		const callChain = new Set<string>();

		// External A2A call: the API key belongs to the agent itself
		const isExternalCall = req.user.id === agentId;

		const taskOptions = {
			externalAgents: externalAgents as ExternalAgentConfig[] | undefined,
			callChain,
			byokApiKey,
			callerId,
			workflowCredentials,
			isExternalCall,
		};

		if (!wantsStream) {
			const result = await this.agentsService.executeAgentTask(
				agentId,
				prompt,
				{ remaining: MAX_ITERATIONS },
				taskOptions,
			);
			res.json(result);
			return undefined;
		}

		await executeTaskOverSse(req, res, (onStep) =>
			this.agentsService.executeAgentTask(
				agentId,
				prompt,
				{ remaining: MAX_ITERATIONS },
				{
					...taskOptions,
					onStep,
				},
			),
		);
		return undefined;
	}
}
