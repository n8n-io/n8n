import { AgentPublicDto, CreatedAgentPublicDto, CreateAgentPublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { AgentsService } from '@/modules/agents/agents.service';
import { AgentRunnableStateService } from '@/modules/agents/agent-runnable-state.service';
import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import { mapAgentDto } from '@/modules/agents/agent-response.mapper';

@PublicApiController('/agents')
export class AgentsPublicController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly runnableState: AgentRunnableStateService,
		private readonly defaultModelResolver: AgentDefaultModelResolverService,
	) {}

	@Post('/')
	@ApiKeyScope('agent:create')
	@ApiSummary('Create an agent')
	@ApiDescription(
		'Create an agent in the specified project. If projectId is omitted, use your personal project.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(201, CreatedAgentPublicDto)
	@ApiErrorResponse(422)
	async createAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateAgentPublicDto,
	): Promise<CreatedAgentPublicDto> {
		// The body selects the project, so the service checks project permissions.
		const projectId = await this.agentsService.resolveOwningProjectId(req.user, body.projectId);
		const defaultModel =
			body.config?.model === undefined
				? await this.defaultModelResolver.resolve(req.user, projectId)
				: undefined;
		const { agent, config, configHash } = await this.agentsService.createOrAdopt(
			projectId,
			body.name,
			{
				actor: { kind: 'user', user: req.user },
				user: req.user,
				createdBy: 'user',
				config: body.config,
				tools: body.tools,
				availableInMCP: body.availableInMCP,
				...(defaultModel ? { defaultModel } : {}),
			},
		);
		const state = await this.runnableState.addRunnableState(agent, projectId, req.user);
		return AgentPublicDto.parse(mapAgentDto(agent, { ...state, config, configHash }));
	}
}
