import { type AgentCapabilitySummary, CreateAgentDto, ListAgentsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentRunnableStateService } from './agent-runnable-state.service';
import { AgentsService } from './agents.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentsController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentRunnableStateService: AgentRunnableStateService,
	) {}

	@Post('/')
	@ProjectScope('agent:create')
	async create(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateAgentDto,
	) {
		const { projectId } = req.params;

		const agent = await this.agentsService.create(projectId, payload.name);
		return await this.agentRunnableStateService.addRunnableState(agent, projectId, req.user);
	}

	@Get('/')
	@ProjectScope('agent:list')
	async list(
		req: AuthenticatedRequest<
			{ projectId: string },
			unknown,
			unknown,
			{ filter?: string; skip?: string; take?: string; sortBy?: string }
		>,
		res: Response,
		@Query query: ListAgentsQueryDto,
	) {
		res.json(await this.agentsService.findByProjectIdPaginated(req.params.projectId, query));
	}

	@Get('/:agentId')
	@ProjectScope('agent:read')
	async get(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const agent = await this.agentsService.findById(agentId, req.params.projectId);

		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return await this.agentRunnableStateService.addRunnableState(
			agent,
			req.params.projectId,
			req.user,
		);
	}

	/** Capability metadata for the canvas node card (model + chip labels). */
	@Get('/:agentId/summary')
	@ProjectScope('agent:read')
	async getSummary(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentCapabilitySummary> {
		const { projectId, agentId } = req.params;
		return await this.agentsService.getCapabilitySummary(agentId, projectId);
	}

	@Delete('/:agentId')
	@ProjectScope('agent:delete')
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
}
