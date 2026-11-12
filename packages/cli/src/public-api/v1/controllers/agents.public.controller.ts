import {
	agentIdParamSchema,
	CreatedAgentPublicDto,
	CreateAgentPublicDto,
	DeletedAgentPublicDto,
	type AgentDto,
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
	Param,
	Post,
	ProjectScope,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';
import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import { AgentResponseMapper } from '@/modules/agents/agent-response.mapper';
import type { DeletedAgentSnapshot } from '@/modules/agents/agents.service';
import { AgentsService } from '@/modules/agents/agents.service';

@PublicApiController('/agents')
export class AgentsPublicController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentResponseMapper: AgentResponseMapper,
		private readonly agentDefaultModelResolverService: AgentDefaultModelResolverService,
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

		return this.toCreatedAgentPublicDto(
			await this.agentResponseMapper.toAgentDto(agent, projectId, req.user),
		);
	}

	@Delete('/:agentId')
	@ApiKeyScope('agent:delete')
	@ProjectScope('agent:delete')
	@ApiSummary('Delete an agent')
	@ApiDescription('Delete an agent and its associated resources.')
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

	private toCreatedAgentPublicDto(agent: AgentDto): CreatedAgentPublicDto {
		return {
			id: agent.id,
			name: agent.name,
			projectId: agent.projectId,
			project: agent.project,
			availableInMCP: agent.availableInMCP,
			isArchived: agent.isArchived,
			versionId: agent.versionId,
			activeVersionId: agent.activeVersionId,
			createdAt: agent.createdAt,
			updatedAt: agent.updatedAt,
			config: agent.config,
			configHash: agent.configHash,
			tools: agent.tools,
			activeVersion: agent.activeVersion,
		};
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
