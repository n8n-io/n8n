import {
	type AgentCapabilitySummary,
	AgentJsonConfigSchema,
	CreateAgentDto,
	ListAgentsQueryDto,
	MoveAgentDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Post,
	Patch,
	Licensed,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { Telemetry } from '@/telemetry';
import { NotFoundError } from '@n8n/errors';
import { CollaborationService } from '@/collaboration/collaboration.service';

import { AgentRunnableStateService } from './agent-runnable-state.service';
import { AgentDefaultModelResolverService } from './agent-default-model-resolver.service';
import { AgentsService } from './agents.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentsController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentRunnableStateService: AgentRunnableStateService,
		private readonly agentDefaultModelResolverService: AgentDefaultModelResolverService,
		private readonly collaborationService: CollaborationService,
		private readonly telemetry: Telemetry,
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
				parentFolderId: payload.parentFolderId,
				config: payload.config,
				tagIds: payload.tags,
				...(defaultModel ? { defaultModel } : {}),
				// Keep the config name in sync with the entity name so the list and
				// builder never disagree on a directly-seeded create. Narrowing
				// payload.schema here keeps the spread over a defined config, so its
				// required fields (model, instructions) stay required for the service.
				...(isDuplicate && payload.schema
					? {
							schema: { ...AgentJsonConfigSchema.parse(payload.schema), name: payload.name },
							skills: payload.skills,
							tools: payload.tools,
						}
					: {}),
			},
		);
		if (payload.parentFolderId !== undefined && !creationState.adopted) {
			this.telemetry.track(TELEMETRY_EVENT.PLATFORM.RESOURCE_FOLDER_CHANGED, {
				user_id: req.user.id,
				project_id: projectId,
				resource_type: 'agent',
				action: 'placed',
				source: 'rest',
				folder_id: agent.parentFolderId,
				resource_id: agent.id,
				resource_count: 1,
			});
		}

		return {
			...(await this.agentRunnableStateService.addRunnableState(agent, projectId, req.user)),
			...creationState,
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
		const deleted = await this.agentsService.delete(agentId, req.params.projectId, {
			requireArchived: true,
		});

		if (!deleted) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return { success: true };
	}

	@Patch('/:agentId/move')
	@Licensed('feat:folders')
	@ProjectScope('agent:update')
	async move(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Body payload: MoveAgentDto,
	) {
		const moved = await this.agentsService.move(
			req.params.agentId,
			req.params.projectId,
			payload.parentFolderId,
		);

		if (!moved) {
			throw new NotFoundError('Agent not found');
		}

		this.telemetry.track(TELEMETRY_EVENT.PLATFORM.RESOURCE_FOLDER_CHANGED, {
			user_id: req.user.id,
			project_id: req.params.projectId,
			resource_type: 'agent',
			action: 'moved',
			source: 'rest',
			folder_id: payload.parentFolderId,
			resource_id: req.params.agentId,
			resource_count: 1,
		});

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
