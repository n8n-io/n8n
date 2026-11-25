import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeCollectionCatalogService } from '@/modules/knowledge/collections/knowledge-collection-catalog.service';

import { KnowledgeCollectionAgentsController } from '../knowledge-collection-agents.controller';
import type { AgentRepository } from '../repositories/agent.repository';

const user = { id: 'user-1' };

function makeController() {
	const catalogService = mock<KnowledgeCollectionCatalogService>();
	const agentRepository = mock<AgentRepository>();
	return {
		controller: new KnowledgeCollectionAgentsController(catalogService, agentRepository),
		catalogService,
		agentRepository,
	};
}

describe('KnowledgeCollectionAgentsController', () => {
	it('returns the id, name and project of the agents that use the collection, by name', async () => {
		const { controller, catalogService, agentRepository } = makeController();
		catalogService.listAgentIds.mockResolvedValue(['agent-1', 'agent-2']);
		agentRepository.findSummariesByIds.mockResolvedValue([
			{ id: 'agent-2', name: 'Beta', projectId: 'project-2' },
			{ id: 'agent-1', name: 'Alpha', projectId: 'project-1', description: 'not sent' } as never,
		]);

		await expect(
			controller.listAgents({ user } as never, undefined as never, 'project-1', 'collection-1'),
		).resolves.toEqual([
			{ id: 'agent-1', name: 'Alpha', projectId: 'project-1' },
			{ id: 'agent-2', name: 'Beta', projectId: 'project-2' },
		]);
		expect(catalogService.listAgentIds).toHaveBeenCalledWith(user, {
			projectId: 'project-1',
			collectionId: 'collection-1',
		});
		expect(agentRepository.findSummariesByIds).toHaveBeenCalledWith(['agent-1', 'agent-2']);
	});

	it('reads no agent when the collection is not in the project', async () => {
		const { controller, catalogService, agentRepository } = makeController();
		catalogService.listAgentIds.mockRejectedValue(
			new NotFoundError('Knowledge collection not found'),
		);

		await expect(
			controller.listAgents({ user } as never, undefined as never, 'project-1', 'collection-1'),
		).rejects.toThrow(NotFoundError);
		expect(agentRepository.findSummariesByIds).not.toHaveBeenCalled();
	});
});
