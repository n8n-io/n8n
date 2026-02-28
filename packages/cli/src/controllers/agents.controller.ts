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

import {
	isA2AStreamEvent,
	a2aStreamEventToInternal,
	normalizeAgentCard,
	unwrapJsonRpc,
	classifyEndpoint,
	buildRequestBody,
	buildRequestHeaders,
	a2aResponseToInternal,
} from '@/agents/a2a-adapter';
import { validateExternalAgentUrl } from '@/agents/validate-agent-url';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { sendErrorResponse } from '@/response-helper';
import { AgentsService } from '@/services/agents/agents.service';
import type { ExternalAgentConfig } from '@/services/agents/agents.types';
import { MAX_ITERATIONS, executeTaskOverSse, sseWrite } from '@/services/agents/agents.types';

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

		// Fetch the remote agent card — try v0.3 path first, fall back to v0.2
		const baseCardUrl = url
			.replace(/\/+$/, '')
			.replace(/\/\.well-known\/agent(?:-card)?\.json$/, '');
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);

		const fetchHeaders: Record<string, string> = { Accept: 'application/json' };
		if (apiKey) {
			fetchHeaders['x-n8n-api-key'] = apiKey;
			fetchHeaders['X-API-Key'] = apiKey;
		}

		try {
			// Try agent-card.json (v0.3) first
			let response = await fetch(`${baseCardUrl}/.well-known/agent-card.json`, {
				headers: fetchHeaders,
				signal: controller.signal,
			});

			// Fall back to agent.json (v0.2) if v0.3 path not found
			if (response.status === 404) {
				response = await fetch(`${baseCardUrl}/.well-known/agent.json`, {
					headers: fetchHeaders,
					signal: controller.signal,
				});
			}

			if (!response.ok) {
				throw new BadRequestError(
					`Remote instance returned ${String(response.status)}: ${await response.text()}`,
				);
			}

			const card = (await response.json()) as Record<string, unknown>;
			return normalizeAgentCard(card);
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

		// Resolve protocol version from registration for accurate format detection
		const protocolVersion = registrationId
			? await this.agentsService.resolveProtocolVersion(registrationId)
			: undefined;

		// Classify endpoint to determine request format and headers
		const endpointType = classifyEndpoint(url, protocolVersion);
		const requestBody = buildRequestBody(
			endpointType,
			prompt,
			byokCredentials as Record<string, unknown> | undefined,
		);
		const taskHeaders = buildRequestHeaders(endpointType, apiKey);

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: taskHeaders,
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});

			if (!response.ok) {
				const text = await response.text();
				const errorMsg = `Remote agent returned ${String(response.status)}: ${text}`;
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				});
				sseWrite(res, { type: 'task.completion', status: 'error', summary: errorMsg });
				res.end();
				return undefined;
			}

			const contentType = response.headers.get('content-type') ?? '';

			// If remote supports SSE, pipe the stream through with A2A translation
			if (contentType.includes('text/event-stream') && response.body) {
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				});

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						buffer += decoder.decode(value, { stream: true });

						// Process complete SSE events (separated by double newline)
						const parts = buffer.split('\n\n');
						// Keep the last part as it may be incomplete
						buffer = parts.pop() ?? '';

						for (const part of parts) {
							if (!part.trim()) continue;

							// Extract data from SSE event lines
							const dataLines = part
								.split('\n')
								.filter((line) => line.startsWith('data:'))
								.map((line) => line.slice(5).trim());

							if (dataLines.length === 0) {
								// Not a data event (could be comment/ping), pass through
								res.write(part + '\n\n');
								continue;
							}

							const dataStr = dataLines.join('');
							let parsed: Record<string, unknown>;
							try {
								parsed = JSON.parse(dataStr) as Record<string, unknown>;
							} catch {
								// Not valid JSON, pass through raw
								res.write(part + '\n\n');
								continue;
							}

							// Unwrap JSON-RPC envelope if present
							parsed = unwrapJsonRpc(parsed);

							// Auto-detect: A2A format or JSON-RPC error → translate, n8n internal → pass through
							if ('__jsonRpcError' in parsed || isA2AStreamEvent(parsed)) {
								const translated = a2aStreamEventToInternal(parsed);
								if (translated) {
									sseWrite(res, translated);
									if (translated.type === 'task.completion') {
										reader.cancel();
										break;
									}
								}
								// null = skip (e.g. 'submitted' state)
							} else {
								// Already n8n internal format, pass through
								sseWrite(res, JSON.parse(dataStr) as Record<string, unknown>);
							}
						}
					}
				} catch {
					// Stream interrupted
				} finally {
					res.end();
				}
			} else {
				// Non-streaming JSON response — translate and wrap as SSE for the frontend
				const data = (await response.json()) as Record<string, unknown>;
				const translated = endpointType === 'n8n' ? data : a2aResponseToInternal(data);

				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				});
				sseWrite(res, {
					type: 'task.completion',
					status: translated.status ?? 'completed',
					summary: translated.summary ?? 'Task completed',
				});
				res.end();
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!res.headersSent) {
				// Send error as SSE so the frontend's stream reader can pick it up
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				});
			}
			sseWrite(res, {
				type: 'task.completion',
				status: 'error',
				summary: `External task failed: ${message}`,
			});
			res.end();
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
