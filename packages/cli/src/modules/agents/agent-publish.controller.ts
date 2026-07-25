import {
	type AgentVersionListItemDto,
	PaginationDto,
	PublishAgentDto,
	RevertAgentToVersionDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentPublishService } from './agent-publish.service';
import { AgentRunnableStateService } from './agent-runnable-state.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentPublishController {
	constructor(
		private readonly agentPublishService: AgentPublishService,
		private readonly agentRunnableStateService: AgentRunnableStateService,
	) {}

	@Post('/:agentId/publish')
	@ProjectScope('agent:publish')
	async publish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: PublishAgentDto,
	) {
		const { agent, draftValidation } = await this.agentPublishService.publishAgent(
			agentId,
			req.params.projectId,
			req.user,
			'editor',
			payload?.versionId,
		);
		return await this.agentRunnableStateService.addRunnableState(
			agent,
			req.params.projectId,
			req.user,
			draftValidation,
		);
	}

	@Post('/:agentId/unpublish')
	@ProjectScope('agent:unpublish')
	async unpublish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const agent = await this.agentPublishService.unpublishAgent(
			agentId,
			req.params.projectId,
			req.user,
			'editor',
		);
		return await this.agentRunnableStateService.addRunnableState(
			agent,
			req.params.projectId,
			req.user,
		);
	}

	@Post('/:agentId/revert-to-published')
	@ProjectScope('agent:update')
	async revertToPublished(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const agent = await this.agentPublishService.revertToPublishedAgent(
			agentId,
			req.params.projectId,
		);
		return await this.agentRunnableStateService.addRunnableState(
			agent,
			req.params.projectId,
			req.user,
		);
	}

	@Post('/:agentId/revert-to-version')
	@ProjectScope('agent:update')
	async revertToVersion(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: RevertAgentToVersionDto,
	) {
		const agent = await this.agentPublishService.revertToVersion(
			agentId,
			req.params.projectId,
			payload.versionId,
		);
		return await this.agentRunnableStateService.addRunnableState(
			agent,
			req.params.projectId,
			req.user,
		);
	}

	@Get('/:agentId/versions')
	@ProjectScope('agent:read')
	async listVersions(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Query query: PaginationDto,
	): Promise<AgentVersionListItemDto[]> {
		return await this.agentPublishService.listPublishHistory(
			agentId,
			req.params.projectId,
			query.take,
			query.skip,
		);
	}
}
