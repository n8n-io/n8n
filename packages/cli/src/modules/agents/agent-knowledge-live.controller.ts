import {
	ResolveAgentLiveSourceLinkDto,
	type AgentJsonLiveSourceConfig,
	type ResolveAgentLiveSourceLinkResult,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import {
	LiveRetrievalService,
	type LiveKnowledgeScope,
} from '@/modules/knowledge/live-sources/live-retrieval.service';
import { isLiveSourceError } from '@/modules/knowledge/live-sources/live-source.errors';

import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

/**
 * The live knowledge sources of an agent: a pasted link resolved into a picked
 * item, and the index of a source (its status, and a rebuild). The index lives
 * in memory per agent and source; the rebuild and the link resolution read the
 * source with its credential, as a tool call does. Experimental, behind the
 * live sources flag.
 */
@RestController('/projects/:projectId/agents/v2')
export class AgentKnowledgeLiveController {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly knowledgeAvailabilityService: KnowledgeAvailabilityService,
		private readonly liveRetrievalService: LiveRetrievalService,
	) {}

	/**
	 * Resolves a pasted link into an item the agent can pick. The source needs
	 * no saved config yet: the provider and the credential come in the body.
	 */
	@Post('/:agentId/knowledge/live-sources/resolve-link')
	@ProjectScope('agent:update')
	async resolveLink(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Body payload: ResolveAgentLiveSourceLinkDto,
	): Promise<ResolveAgentLiveSourceLinkResult> {
		this.assertEnabled();
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const scope: LiveKnowledgeScope = {
			projectId,
			agentId,
			principal: { kind: 'person', user: req.user },
		};
		try {
			const item = await this.liveRetrievalService.resolveLink(
				scope,
				{ id: payload.provider, provider: payload.provider, credential: payload.credential },
				payload.url,
			);
			return { item };
		} catch (error) {
			// The messages are sanitized already, and the cause is the input, not the server.
			if (isLiveSourceError(error)) throw new BadRequestError(error.message);
			throw error;
		}
	}

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
		this.assertEnabled();
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

	private assertEnabled(): void {
		if (!this.knowledgeAvailabilityService.isLiveSourcesEnabled()) {
			throw new NotFoundError('Live knowledge sources are not enabled');
		}
	}
}
