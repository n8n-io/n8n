import {
	agentIdParamSchema,
	AgentListPublicDto,
	AgentPublicDto,
	CreatedAgentPublicDto,
	CreateAgentPublicDto,
	DeletedAgentPublicDto,
	ListAgentsPublicQueryDto,
	PublishAgentPublicDto,
	UpdateAgentPublicDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Param,
	Post,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError, NotFoundError, UnprocessableRequestError, UserError } from '@n8n/errors';
import { AgentConfigService } from '@/modules/agents/agent-config.service';
import { AgentCustomToolsService } from '@/modules/agents/agent-custom-tools.service';
import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import {
	AgentResponseMapper,
	mapAgentListPublicItem,
} from '@/modules/agents/agent-response.mapper';
import type { DeletedAgentSnapshot } from '@/modules/agents/agents.service';
import { AgentsService } from '@/modules/agents/agents.service';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

@PublicApiController('/agents')
export class AgentsPublicController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentResponseMapper: AgentResponseMapper,
		private readonly agentDefaultModelResolverService: AgentDefaultModelResolverService,
		private readonly agentCustomToolsService: AgentCustomToolsService,
		private readonly agentConfigService: AgentConfigService,
		private readonly agentPublishService: AgentPublishService,
	) {}

	@Post('/')
	@ApiKeyScope('agent:create')
	@ApiSummary('Create an agent')
	@ApiDescription('Create an agent in your personal project or a team project you have access to.')
	@ApiTags(['Agent'])
	@ApiResponse(201, CreatedAgentPublicDto)
	@ApiErrorResponse(404)
	async createAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateAgentPublicDto,
	): Promise<CreatedAgentPublicDto> {
		// The tools are new input, so enforce the same name rules as the
		// custom-tool write path before they reach the entity.
		for (const tool of Object.values(body.tools ?? {})) {
			this.agentCustomToolsService.validateDescriptor(tool.descriptor);
		}

		// `projectId` comes from the body, so RBAC is enforced here rather
		// than through `@ProjectScope`, which only reads path params.
		const projectId = await this.agentsService.resolveOwningProjectId(req.user, body.projectId);

		const defaultModel =
			body.config?.model === undefined
				? await this.agentDefaultModelResolverService.resolve(req.user, projectId)
				: undefined;

		const { agent } = await this.agentsService.createOrAdopt(projectId, body.name, {
			actor: { kind: 'user', user: req.user },
			user: req.user,
			createdBy: 'user',
			config: body.config,
			tools: body.tools,
			availableInMCP: body.availableInMCP,
			...(defaultModel ? { defaultModel } : {}),
		});

		return await this.agentResponseMapper.toPublicDto(agent, projectId, req.user);
	}

	@Get('/:agentId')
	@ApiKeyScope('agent:read')
	@ProjectScope('agent:read')
	@ApiSummary('Retrieve an agent')
	@ApiDescription(
		'Retrieve one agent by ID. The response carries the agent configuration that the update endpoint writes back.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, AgentPublicDto)
	@ApiErrorResponse(404)
	async getAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
	): Promise<AgentPublicDto> {
		// `@ProjectScope` has already authorized the user against the agent's
		// project, so the agent is resolved by ID alone.
		const agent = await this.agentsService.findById(agentId);

		if (!agent) {
			// the user cannot see this agent, or it does not exist
			throw new NotFoundError('Not Found');
		}

		return await this.agentResponseMapper.toPublicDto(agent, agent.projectId ?? '', req.user);
	}

	@Get('/')
	@ApiKeyScope('agent:list')
	@ApiSummary('List agents')
	@ApiDescription(
		'List the agents in the projects where you hold the agent:list permission. ' +
			'The response is one cursor page: read the next page with the cursor query parameter. ' +
			'Narrow the list to one project with projectId.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, AgentListPublicDto)
	async listAgents(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListAgentsPublicQueryDto,
	): Promise<AgentListPublicDto> {
		const { offset, limit } = resolveOffsetPagination({ cursor: query.cursor, limit: query.limit });

		const { count, data } = await this.agentsService.findListableByUserPaginated(req.user, {
			offset,
			limit,
			filter: query.projectId ? { projectId: query.projectId } : {},
		});

		return {
			data: data.map(mapAgentListPublicItem),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Put('/:agentId')
	@ApiKeyScope('agent:update')
	@ProjectScope('agent:update')
	@ApiSummary('Update an agent')
	@ApiDescription(
		'Replace the configuration of an agent. Send the configuration and the concurrency token you read from the retrieve endpoint: ' +
			'a stale token returns a conflict. Fields the server manages are ignored, not rejected. ' +
			'The retrieved body of an agent without a configuration carries a null configuration: ' +
			'sending it back changes nothing.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, AgentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
		@Body body: UpdateAgentPublicDto,
	): Promise<AgentPublicDto> {
		const agent = await this.agentsService.findById(agentId);
		if (!agent?.projectId) {
			throw new NotFoundError('Not Found');
		}

		// A retrieved body carries `config: null` when the agent has no
		// configuration. Writing that back is a no-op; removing a stored
		// configuration is not an operation this endpoint offers.
		if (body.config === null) {
			if (agent.schema) {
				throw new BadRequestError(
					'Provide the configuration document: the update endpoint cannot remove it.',
				);
			}
			return await this.agentResponseMapper.toPublicDto(agent, agent.projectId, req.user);
		}

		// The Public API has no push channel, so no client write lock is
		// validated here: without a push connection there is no client to hold
		// the lock. Concurrent edits surface as the stale `baseConfigHash`
		// conflict (409) below.
		await this.agentConfigService.updateConfig(agentId, agent.projectId, body.config, req.user, {
			baseConfigHash: body.baseConfigHash,
			modifiedBy: 'user',
		});

		const updated = await this.agentsService.findById(agentId);
		if (!updated) {
			throw new NotFoundError('Not Found');
		}

		return await this.agentResponseMapper.toPublicDto(updated, updated.projectId ?? '', req.user);
	}

	@Post('/:agentId/publish')
	@ApiKeyScope('agent:publish')
	@ProjectScope('agent:publish')
	@ApiSummary('Publish an agent')
	@ApiDescription(
		'Publish an agent. Omit versionId to publish the current draft. Send versionId to publish a saved version.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, AgentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(422)
	async publishAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
		@Body body: PublishAgentPublicDto,
	): Promise<AgentPublicDto> {
		const agent = await this.agentsService.findById(agentId);
		if (!agent?.projectId) {
			throw new NotFoundError('Not Found');
		}

		try {
			const { agent: published } = await this.agentPublishService.publishAgent(
				agentId,
				agent.projectId,
				req.user,
				{ by: 'user', trigger: 'explicit' },
				body.versionId,
			);
			return await this.agentResponseMapper.toPublicDto(
				published,
				published.projectId ?? agent.projectId,
				req.user,
			);
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof UserError) {
				throw new UnprocessableRequestError(error.message);
			}
			throw error;
		}
	}

	@Post('/:agentId/unpublish')
	@ApiKeyScope('agent:unpublish')
	@ProjectScope('agent:unpublish')
	@ApiSummary('Unpublish an agent')
	@ApiDescription(
		'Unpublish an agent. This stops the published version and disconnects its live channels.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, AgentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async unpublishAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
	): Promise<AgentPublicDto> {
		const agent = await this.agentsService.findById(agentId);
		if (!agent?.projectId) {
			throw new NotFoundError('Not Found');
		}

		const unpublished = await this.agentPublishService.unpublishAgent(
			agentId,
			agent.projectId,
			req.user,
			'user',
		);
		return await this.agentResponseMapper.toPublicDto(
			unpublished,
			unpublished.projectId ?? agent.projectId,
			req.user,
		);
	}

	@Delete('/:agentId')
	@ApiKeyScope('agent:delete')
	@ProjectScope('agent:delete')
	@ApiSummary('Delete an agent')
	@ApiDescription(
		'Delete an agent and its associated resources. The agent is deleted right away: ' +
			'it does not need to be archived first, and a published agent with live channels is ' +
			'deleted too. This matches the workflow delete endpoint.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, DeletedAgentPublicDto)
	@ApiErrorResponse(404)
	async deleteAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
	): Promise<DeletedAgentPublicDto> {
		const deleted = await this.agentsService.delete(agentId, req.user, undefined, {}, req.ctx);

		if (!deleted) {
			// the user cannot see this agent, or it does not exist
			throw new NotFoundError('Not Found');
		}

		return this.toDeletedAgentPublicDto(deleted);
	}

	@Post('/:agentId/archive')
	@ApiKeyScope('agent:delete')
	@ProjectScope('agent:delete')
	@ApiSummary('Archive an agent')
	@ApiDescription(
		'Soft-deletes an agent by archiving it. Idempotent: archiving an already ' +
			'archived agent returns 200 with the current agent.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, AgentPublicDto)
	@ApiErrorResponse(404)
	async archiveAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
	): Promise<AgentPublicDto> {
		const existing = await this.agentsService.findById(agentId);
		if (!existing?.projectId) throw new NotFoundError('Not Found');

		try {
			const archived = await this.agentPublishService.archiveAgent(
				agentId,
				existing.projectId,
				req.user,
				undefined,
				'user',
				req.ctx,
			);
			return await this.agentResponseMapper.toPublicDto(archived, existing.projectId, req.user);
		} catch (error) {
			// The service rejects an agent that is already archived. This endpoint returns that agent.
			if (!(error instanceof BadRequestError)) throw error;
			const current = await this.agentsService.findById(agentId);
			if (!current?.isArchived || !current.projectId) throw error;
			return await this.agentResponseMapper.toPublicDto(current, current.projectId, req.user);
		}
	}

	@Post('/:agentId/unarchive')
	@ApiKeyScope('agent:delete')
	@ProjectScope('agent:delete')
	@ApiSummary('Unarchive an agent')
	@ApiDescription('Restores an archived agent.')
	@ApiTags(['Agent'])
	@ApiResponse(200, AgentPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async unarchiveAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
	): Promise<AgentPublicDto> {
		const existing = await this.agentsService.findById(agentId);
		if (!existing?.projectId) throw new NotFoundError('Not Found');
		const restored = await this.agentPublishService.unarchiveAgent(
			agentId,
			existing.projectId,
			req.user,
			undefined,
			req.ctx,
		);
		return await this.agentResponseMapper.toPublicDto(restored, existing.projectId, req.user);
	}

	private toDeletedAgentPublicDto(agent: DeletedAgentSnapshot): DeletedAgentPublicDto {
		return {
			id: agent.id,
			name: agent.name,
			projectId: agent.projectId,
			availableInMCP: agent.availableInMCP,
			versionId: agent.versionId,
			activeVersionId: agent.activeVersionId,
			createdAt: toIsoTimestamp(agent.createdAt),
			updatedAt: toIsoTimestamp(agent.updatedAt),
		};
	}
}

function toIsoTimestamp(value: Date | string | undefined): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'string' && value.length > 0) return value;
	return new Date(0).toISOString();
}
