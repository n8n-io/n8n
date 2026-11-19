import type { AgentJsonLiveSourceConfig } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import {
	LiveRetrievalService,
	type LiveKnowledgeScope,
} from '@/modules/knowledge/live-sources/live-retrieval.service';

import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

/**
 * The index of a live knowledge source: its status, and a rebuild. The index
 * lives in memory per agent and source; the rebuild reads the source with
 * its credential, as a tool call does. Experimental, behind the live sources flag.
 */
@RestController('/projects/:projectId/agents/v2')
export class AgentKnowledgeLiveController {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly knowledgeAvailabilityService: KnowledgeAvailabilityService,
		private readonly liveRetrievalService: LiveRetrievalService,
	) {}

	@Get('/:agentId/knowledge/live-sources/:sourceId/index')
	@ProjectScope('agent:read')
	async getIndexStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Param('sourceId') sourceId: string,
	) {
		const { scope, source } = await this.resolve(req, projectId, agentId, sourceId);
		return this.liveRetrievalService.indexStatus(scope, source) ?? { building: false };
	}

	/** Rebuilds the index and answers when it is done. A build in progress is joined. */
	@Post('/:agentId/knowledge/live-sources/:sourceId/index')
	@ProjectScope('agent:update')
	async rebuildIndex(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Param('sourceId') sourceId: string,
	) {
		const { scope, source } = await this.resolve(req, projectId, agentId, sourceId);
		return await this.liveRetrievalService.rebuildIndex(scope, source);
	}

	private async resolve(
		req: AuthenticatedRequest<{ projectId: string }>,
		projectId: string,
		agentId: string,
		sourceId: string,
	): Promise<{ scope: LiveKnowledgeScope; source: AgentJsonLiveSourceConfig }> {
		if (!this.knowledgeAvailabilityService.isLiveSourcesEnabled()) {
			throw new NotFoundError('Live knowledge sources are not enabled');
		}
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const source = agent.schema?.knowledge?.liveSources?.find(
			(candidate) => candidate.id === sourceId,
		);
		if (!source) {
			throw new NotFoundError(`Live knowledge source "${sourceId}" not found`);
		}
		return {
			scope: { projectId, agentId, principal: { kind: 'person', user: req.user } },
			source,
		};
	}
}
