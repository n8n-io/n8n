import { CreateAgentDto, ListAgentsQueryDto, UpdateAgentDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
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

	@Patch('/:agentId')
	@ProjectScope('agent:update')
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

		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return await this.agentRunnableStateService.addRunnableState(
			agent,
			req.params.projectId,
			req.user,
		);
	}

	@Delete('/:agentId')
	@ProjectScope('agent:delete')
	async delete(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const deleted = await this.agentsService.delete(agentId, req.params.projectId, req.user.id);

		if (!deleted) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return { success: true };
	}
}
