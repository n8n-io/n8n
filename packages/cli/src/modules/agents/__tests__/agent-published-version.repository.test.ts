import { mock } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { AgentPublishedVersion } from '../entities/agent-published-version.entity';
import { AgentPublishedVersionRepository } from '../repositories/agent-published-version.repository';

const entityManager = mockEntityManager(AgentPublishedVersion);
const mockDataSource = { manager: entityManager };

describe('AgentPublishedVersionRepository', () => {
	let repository: AgentPublishedVersionRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = new AgentPublishedVersionRepository(mockDataSource as never);
	});

	describe('findByAgentId', () => {
		it('returns the published version when found', async () => {
			const publishedVersion = mock<AgentPublishedVersion>({ agentId: 'agent-1' });
			jest.spyOn(repository, 'findOneBy').mockResolvedValue(publishedVersion);

			const result = await repository.findByAgentId('agent-1');

			expect(repository.findOneBy).toHaveBeenCalledWith({ agentId: 'agent-1' });
			expect(result).toBe(publishedVersion);
		});

		it('returns null when no record exists', async () => {
			jest.spyOn(repository, 'findOneBy').mockResolvedValue(null);

			const result = await repository.findByAgentId('agent-1');

			expect(result).toBeNull();
		});
	});

	describe('savePublishedVersion', () => {
		const payload = {
			agentId: 'agent-1',
			schema: null,
			model: 'claude-3',
			provider: 'anthropic',
			credentialId: 'cred-1',
			publishedById: 'user-1',
		};

		it('creates a new entity when no existing record is found', async () => {
			const newEntity = mock<AgentPublishedVersion>();
			const savedEntity = mock<AgentPublishedVersion>();
			jest.spyOn(repository, 'findByAgentId').mockResolvedValue(null);
			jest.spyOn(repository, 'create').mockReturnValue(newEntity);
			jest.spyOn(repository, 'save').mockResolvedValue(savedEntity);

			const result = await repository.savePublishedVersion(payload);

			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({ ...payload, publishedAt: expect.any(Date) }),
			);
			expect(repository.save).toHaveBeenCalledWith(newEntity);
			expect(result).toBe(savedEntity);
		});

		it('updates the existing entity when a record already exists', async () => {
			const existing = mock<AgentPublishedVersion>({ agentId: 'agent-1' });
			const savedEntity = mock<AgentPublishedVersion>();
			jest.spyOn(repository, 'findByAgentId').mockResolvedValue(existing);
			jest.spyOn(repository, 'create');
			jest.spyOn(repository, 'save').mockResolvedValue(savedEntity);

			const result = await repository.savePublishedVersion(payload);

			// The existing entity is mutated via Object.assign (no new entity created)
			expect(repository.create).not.toHaveBeenCalled();
			expect(repository.save).toHaveBeenCalledTimes(1);
			expect(result).toBe(savedEntity);
		});
	});

	describe('deleteByAgentId', () => {
		it('calls delete with the correct agentId filter', async () => {
			jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

			await repository.deleteByAgentId('agent-1');

			expect(repository.delete).toHaveBeenCalledWith({ agentId: 'agent-1' });
		});
	});
});
