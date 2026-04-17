/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';

const entityManager = mockEntityManager(Agent);
const mockDataSource = { manager: entityManager };

describe('AgentRepository', () => {
	let repository: AgentRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = new AgentRepository(mockDataSource as never);
	});

	describe('findByIdAndProjectId', () => {
		it('calls findOne with id, projectId, and the publishedVersion relation', async () => {
			const agent = mock<Agent>({ id: 'agent-1', projectId: 'project-1' });
			jest.spyOn(repository, 'findOne').mockResolvedValue(agent);

			const result = await repository.findByIdAndProjectId('agent-1', 'project-1');

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { id: 'agent-1', projectId: 'project-1' },
				relations: { publishedVersion: true },
			});
			expect(result).toBe(agent);
		});

		it('returns null when no agent matches', async () => {
			jest.spyOn(repository, 'findOne').mockResolvedValue(null);

			const result = await repository.findByIdAndProjectId('agent-1', 'project-1');

			expect(result).toBeNull();
		});
	});

	describe('findByProjectId', () => {
		it('calls find ordered by updatedAt descending with the publishedVersion relation', async () => {
			const agents = [mock<Agent>(), mock<Agent>()];
			jest.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByProjectId('project-1');

			expect(repository.find).toHaveBeenCalledWith({
				where: { projectId: 'project-1' },
				relations: { publishedVersion: true },
				order: { updatedAt: 'DESC' },
			});
			expect(result).toBe(agents);
		});

		it('returns an empty array when the project has no agents', async () => {
			jest.spyOn(repository, 'find').mockResolvedValue([]);

			const result = await repository.findByProjectId('project-1');

			expect(result).toEqual([]);
		});
	});
});
