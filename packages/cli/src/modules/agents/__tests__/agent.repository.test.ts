/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';

const entityManager = mockEntityManager(Agent);
const mockDataSource = { manager: entityManager };

describe('AgentRepository', () => {
	let repository: AgentRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentRepository(mockDataSource as never);
	});

	describe('findByIdAndProjectId', () => {
		it('calls findOne with id, projectId, and the activeVersion relation', async () => {
			const agent = mock<Agent>({ id: 'agent-1', projectId: 'project-1' });
			vi.spyOn(repository, 'findOne').mockResolvedValue(agent);

			const result = await repository.findByIdAndProjectId('agent-1', 'project-1');

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { id: 'agent-1', projectId: 'project-1' },
				relations: { activeVersion: true },
			});
			expect(result).toBe(agent);
		});

		it('returns null when no agent matches', async () => {
			vi.spyOn(repository, 'findOne').mockResolvedValue(null);

			const result = await repository.findByIdAndProjectId('agent-1', 'project-1');

			expect(result).toBeNull();
		});
	});

	describe('findByProjectId', () => {
		it('calls find ordered by updatedAt descending with the activeVersion relation', async () => {
			const agents = [mock<Agent>(), mock<Agent>()];
			vi.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByProjectId('project-1');

			expect(repository.find).toHaveBeenCalledWith({
				where: { projectId: 'project-1' },
				relations: { activeVersion: true },
				order: { updatedAt: 'DESC' },
			});
			expect(result).toBe(agents);
		});

		it('returns an empty array when the project has no agents', async () => {
			vi.spyOn(repository, 'find').mockResolvedValue([]);

			const result = await repository.findByProjectId('project-1');

			expect(result).toEqual([]);
		});
	});

	describe('findByProjectIdsPaginated', () => {
		it('returns { count: 0, data: [] } immediately when projectIds is empty', async () => {
			const result = await repository.findByProjectIdsPaginated([], {
				skip: 0,
				take: 10,
			} as never);

			expect(result).toEqual({ count: 0, data: [] });
		});

		it('builds the expected query for a single project id', async () => {
			const agents = [mock<Agent>()];
			const mockQb = {
				leftJoinAndSelect: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				addSelect: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				skip: vi.fn().mockReturnThis(),
				take: vi.fn().mockReturnThis(),
				getManyAndCount: vi.fn().mockResolvedValue([agents, 1]),
			};
			vi.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQb as never);

			const result = await repository.findByProjectIdsPaginated(['project-1'], {
				skip: 0,
				take: 25,
				sortBy: 'name:asc',
			} as never);

			expect(mockQb.where).toHaveBeenCalledWith('agent.projectId IN (:...projectIds)', {
				projectIds: ['project-1'],
			});
			expect(mockQb.skip).toHaveBeenCalledWith(0);
			expect(mockQb.take).toHaveBeenCalledWith(25);
			expect(result).toEqual({ count: 1, data: agents });
		});

		it('applies the name search filter', async () => {
			const mockQb = {
				leftJoinAndSelect: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				addSelect: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				skip: vi.fn().mockReturnThis(),
				take: vi.fn().mockReturnThis(),
				getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
			};
			vi.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQb as never);

			await repository.findByProjectIdsPaginated(['p1', 'p2'], {
				skip: 0,
				take: 10,
				filter: { query: 'support' },
			} as never);

			expect(mockQb.andWhere).toHaveBeenCalledWith('LOWER(agent.name) LIKE LOWER(:query)', {
				query: '%support%',
			});
		});
	});

	describe('findByIntegrationCredential', () => {
		const makeAgent = (id: string, integrations: AgentIntegrationConfig[]) =>
			({ id, integrations }) as Agent;

		it('returns agents that have a matching type + credentialId, excluding the given agentId', async () => {
			const agents = [
				makeAgent('agent-self', [{ type: 'telegram', credentialId: 'cred-1' }]),
				makeAgent('agent-other', [{ type: 'telegram', credentialId: 'cred-1' }]),
				makeAgent('agent-slack', [{ type: 'slack', credentialId: 'cred-1' }]),
				makeAgent('agent-unrelated', [{ type: 'telegram', credentialId: 'cred-2' }]),
				makeAgent('agent-empty', []),
			];
			vi.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result.map((a) => a.id)).toEqual(['agent-other']);
		});

		it('returns an empty array when no other agent uses the credential', async () => {
			vi.spyOn(repository, 'find').mockResolvedValue([
				makeAgent('agent-self', [{ type: 'telegram', credentialId: 'cred-1' }]),
			]);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result).toEqual([]);
		});

		it('handles agents whose integrations column is null / undefined without crashing', async () => {
			const agents = [
				makeAgent('agent-a', [{ type: 'telegram', credentialId: 'cred-1' }]),
				{ id: 'agent-null', integrations: null } as unknown as Agent,
				{ id: 'agent-undef' } as unknown as Agent,
			];
			vi.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result.map((a) => a.id)).toEqual(['agent-a']);
		});

		it('ignores integrations with a non-matching credentialId', async () => {
			const agents = [
				makeAgent('agent-other', [{ type: 'slack', credentialId: 'cred-other' }]),
				makeAgent('agent-match', [{ type: 'telegram', credentialId: 'cred-1' }]),
			];
			vi.spyOn(repository, 'find').mockResolvedValue(agents);

			const result = await repository.findByIntegrationCredential(
				'telegram',
				'cred-1',
				'project-1',
				'agent-self',
			);

			expect(result.map((a) => a.id)).toEqual(['agent-match']);
		});
	});
});
