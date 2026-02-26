import { CreateAgentDto, DispatchTaskDto, UpdateAgentDto } from '@n8n/api-types';
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

import { sendErrorResponse } from '@/response-helper';
import { AgentsService } from '@/services/agents/agents.service';
import type { ExternalAgentConfig } from '@/services/agents/agents.types';
import { MAX_ITERATIONS, sseWrite } from '@/services/agents/agents.types';

@RestController('/agents')
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post('/')
	@GlobalScope('chatHubAgent:create')
	async createAgent(_req: AuthenticatedRequest, _res: Response, @Body payload: CreateAgentDto) {
		return await this.agentsService.createAgent(payload);
	}

	@Patch('/:agentId')
	@GlobalScope('chatHubAgent:update')
	async updateAgent(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentDto,
	) {
		return await this.agentsService.updateAgent(agentId, payload);
	}

	@Delete('/:agentId')
	@GlobalScope('chatHubAgent:delete')
	async deleteAgent(_req: AuthenticatedRequest, res: Response, @Param('agentId') agentId: string) {
		await this.agentsService.deleteAgent(agentId);
		res.status(204).send();
		return undefined;
	}

	@Get('/')
	@GlobalScope('chatHubAgent:list')
	async listAgents(_req: AuthenticatedRequest) {
		return await this.agentsService.listAgents();
	}

	@Get('/:agentId/capabilities')
	@GlobalScope('chatHubAgent:read')
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

		if (!wantsStream) {
			const result = await this.agentsService.executeAgentTask(
				agentId,
				prompt,
				{ remaining: MAX_ITERATIONS },
				{
					externalAgents: externalAgents as ExternalAgentConfig[] | undefined,
					callChain,
					byokApiKey,
					callerId,
					workflowCredentials,
				},
			);
			res.json(result);
			return undefined;
		}

		res.writeHead(200, {
			'Content-Type': 'text/event-stream; charset=UTF-8',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		});

		try {
			const result = await this.agentsService.executeAgentTask(
				agentId,
				prompt,
				{ remaining: MAX_ITERATIONS },
				{
					onStep: (event) => sseWrite(res, event),
					externalAgents: externalAgents as ExternalAgentConfig[] | undefined,
					callChain,
					byokApiKey,
					callerId,
					workflowCredentials,
				},
			);

			sseWrite(res, {
				type: 'done',
				status: result.status,
				summary: result.summary ?? result.message,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			sseWrite(res, { type: 'done', status: 'error', summary: message });
		}

		res.end();
		return undefined;
	}
}
