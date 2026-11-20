import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeCollectionService } from '@/modules/knowledge/collections/knowledge-collection.service';

import { KnowledgeCollectionAgentsController } from '../knowledge-collection-agents.controller';
import type { AgentRepository } from '../repositories/agent.repository';

const user = { id: 'user-1' };

function makeController() {
	const collectionService = mock<KnowledgeCollectionService>();
	const agentRepository = mock<AgentRepository>();
	return {
		controller: new KnowledgeCollectionAgentsController(collectionService, agentRepository),
		collectionService,
		agentRepository,
	};
}

describe('KnowledgeCollectionAgentsController', () => {
	it('returns the id, name and project of the agents that use the collection, by name', async () => {
		const { controller, collectionService, agentRepository } = makeController();
		collectionService.listAgentIds.mockResolvedValue(['agent-1', 'agent-2']);
		agentRepository.findSummariesByIds.mockResolvedValue([
			{ id: 'agent-2', name: 'Beta', projectId: 'project-2' },
			{ id: 'agent-1', name: 'Alpha', projectId: 'project-1', description: 'not sent' } as never,
		]);

		await expect(
			controller.listAgents({ user } as never, undefined as never, 'collection-1'),
		).resolves.toEqual([
			{ id: 'agent-1', name: 'Alpha', projectId: 'project-1' },
			{ id: 'agent-2', name: 'Beta', projectId: 'project-2' },
		]);
		expect(collectionService.listAgentIds).toHaveBeenCalledWith(user, 'collection-1');
		expect(agentRepository.findSummariesByIds).toHaveBeenCalledWith(['agent-1', 'agent-2']);
	});

	it('reads no agent of a collection the user cannot see', async () => {
		const { controller, collectionService, agentRepository } = makeController();
		collectionService.listAgentIds.mockRejectedValue(
			new NotFoundError('Knowledge collection not found'),
		);

		await expect(
			controller.listAgents({ user } as never, undefined as never, 'collection-1'),
		).rejects.toThrow(NotFoundError);
		expect(agentRepository.findSummariesByIds).not.toHaveBeenCalled();
	});
});
