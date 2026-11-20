import type { AuthenticatedRequest } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import type { LiveRetrievalService } from '@/modules/knowledge/live-sources/live-retrieval.service';
import { LiveSourceUnavailableError } from '@/modules/knowledge/live-sources/live-source.errors';

import { AgentKnowledgeLiveController } from '../agent-knowledge-live.controller';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import { expectProjectScopedAgentRoutes } from './test-utils/controller-route-metadata';

const PAGE = {
	id: 'page-1',
	kind: 'item' as const,
	containerType: 'page',
	title: 'Refund policy',
	url: 'https://notion.so/page-1',
};

function makeController({ enabled = true }: { enabled?: boolean } = {}) {
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockResolvedValue(mock<ProjectAgent>({ id: 'agent-1' }));
	const liveRetrievalService = mock<LiveRetrievalService>();
	const controller = new AgentKnowledgeLiveController(
		agentRepository,
		mock<KnowledgeAvailabilityService>({ isLiveSourcesEnabled: () => enabled }),
		liveRetrievalService,
	);
	const req = mock<AuthenticatedRequest<{ projectId: string }>>({ user: { id: 'user-1' } });
	const res = mock<Response>();
	const resolve = async (payload = { provider: 'notion', credential: 'cred-1', url: PAGE.url }) =>
		await controller.resolveLink(req, res, 'project-1', 'agent-1', payload);
	return { resolve, liveRetrievalService, req };
}

describe('AgentKnowledgeLiveController', () => {
	expectProjectScopedAgentRoutes(AgentKnowledgeLiveController);

	describe('resolveLink', () => {
		it('resolves the link for the signed-in user with the provider and credential of the body', async () => {
			const { resolve, liveRetrievalService, req } = makeController();
			liveRetrievalService.resolveLink.mockResolvedValue(PAGE);

			await expect(resolve()).resolves.toEqual({ item: PAGE });

			expect(liveRetrievalService.resolveLink).toHaveBeenCalledWith(
				{
					projectId: 'project-1',
					agentId: 'agent-1',
					principal: { kind: 'person', user: req.user },
				},
				{ id: 'notion', provider: 'notion', credential: 'cred-1' },
				PAGE.url,
			);
		});

		it('answers a bad request with the sanitized message when the source cannot read the link', async () => {
			const { resolve, liveRetrievalService } = makeController();
			liveRetrievalService.resolveLink.mockRejectedValue(
				new LiveSourceUnavailableError('notion', 'its credential does not exist'),
			);

			await expect(resolve()).rejects.toThrow(BadRequestError);
			await expect(resolve()).rejects.toThrow('its credential does not exist');
		});

		it('is not found while live sources are off', async () => {
			const { resolve, liveRetrievalService } = makeController({ enabled: false });

			await expect(resolve()).rejects.toThrow(NotFoundError);
			expect(liveRetrievalService.resolveLink).not.toHaveBeenCalled();
		});
	});
});
