import {
	agentIdParamSchema,
	AgentListPublicDto,
	AgentPublicDto,
	CreatedAgentPublicDto,
	CreateAgentPublicDto,
	DeletedAgentPublicDto,
	ListAgentsPublicQueryDto,
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
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';
import { AgentCustomToolsService } from '@/modules/agents/agent-custom-tools.service';
import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import {
	AgentResponseMapper,
	mapAgentListPublicItem,
	toAgentPublicDto,
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

		return toAgentPublicDto(await this.agentResponseMapper.toAgentDto(agent, projectId, req.user));
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

		return toAgentPublicDto(
			await this.agentResponseMapper.toAgentDto(agent, agent.projectId ?? '', req.user),
		);
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
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
	): Promise<DeletedAgentPublicDto> {
		const deleted = await this.agentsService.delete(agentId);

		if (!deleted) {
			// the user cannot see this agent, or it does not exist
			throw new NotFoundError('Not Found');
		}

		return this.toDeletedAgentPublicDto(deleted);
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
