import {
	type AgentCapabilitySummary,
	CreateAgentDto,
	ListAgentsQueryDto,
	UpdateAgentDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Post,
	ProjectScope,
	Put,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';
import { CollaborationService } from '@/collaboration/collaboration.service';

import { AgentConfigService } from './agent-config.service';
import { AgentDefaultModelResolverService } from './agent-default-model-resolver.service';
import { AgentResponseMapper } from './agent-response.mapper';
import { AgentsService } from './agents.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentsController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentResponseMapper: AgentResponseMapper,
		private readonly agentDefaultModelResolverService: AgentDefaultModelResolverService,
		private readonly collaborationService: CollaborationService,
		private readonly agentConfigService: AgentConfigService,
	) {}

	@Post('/')
	@ProjectScope('agent:create')
	async create(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateAgentDto,
	) {
		const { projectId } = req.params;
		const isDuplicate = Boolean(payload.schema);

		const defaultModel =
			isDuplicate || payload.config?.model !== undefined
				? undefined
				: await this.agentDefaultModelResolverService.resolve(req.user, projectId);

		const { agent, ...creationState } = await this.agentsService.createOrAdopt(
			projectId,
			payload.name,
			{
				actor: { kind: 'user', user: req.user },
				user: req.user,
				createdBy: 'user',
				pushRef: req.headers?.['push-ref'],
				id: payload.id,
				config: payload.config,
				...(defaultModel ? { defaultModel } : {}),
				// Keep the config name in sync with the entity name so the list and
				// builder never disagree on a directly-seeded create. Narrowing
				// payload.schema here keeps the spread over a defined config, so its
				// required fields (model, instructions) stay required for the service.
				...(isDuplicate && payload.schema
					? {
							schema: { ...payload.schema, name: payload.name },
							skills: payload.skills,
							tools: payload.tools,
						}
					: {}),
			},
		);
		return {
			...(await this.agentResponseMapper.toAgentDto(agent, projectId, req.user)),
			adopted: creationState.adopted,
		};
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
		const page = await this.agentsService.findByProjectIdPaginated(req.params.projectId, query);
		res.json({
			count: page.count,
			data: page.data.map((agent) => this.agentResponseMapper.toAgentListItem(agent)),
		});
	}

	@Put('/:agentId')
	@ProjectScope('agent:update')
	async update(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentDto,
	) {
		const { projectId } = req.params;
		const clientId = req.headers?.['push-ref'];
		await this.collaborationService.validateAgentWriteLock(
			req.user.id,
			clientId,
			projectId,
			agentId,
			'update',
		);
		await this.agentConfigService.updateConfig(agentId, projectId, payload.config, req.user, {
			baseConfigHash: payload.baseConfigHash,
			modifiedBy: 'user',
			pushRef: req.headers?.['push-ref'],
		});
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
		return await this.agentResponseMapper.toAgentDto(agent, projectId, req.user);
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

		return await this.agentResponseMapper.toAgentDto(agent, req.params.projectId, req.user);
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

	@Get('/:agentId/collaboration/write-lock')
	@ProjectScope('agent:read')
	async getWriteLock(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		return await this.collaborationService.getAgentWriteLock(req.params.projectId, agentId);
	}
}
