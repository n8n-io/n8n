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

		it('creates and saves the snapshot, returning the saved entity', async () => {
			const entity = mock<AgentPublishedVersion>();
			const saved = mock<AgentPublishedVersion>();
			jest.spyOn(repository, 'create').mockReturnValue(entity);
			jest.spyOn(repository, 'save').mockResolvedValue(saved);

			const result = await repository.savePublishedVersion(payload);

			expect(repository.create).toHaveBeenCalledWith(
				expect.objectContaining({ ...payload, publishedAt: expect.any(Date) }),
			);
			expect(repository.save).toHaveBeenCalledWith(entity);
			expect(result).toBe(saved);
		});

		it('uses the transaction-scoped repository when trx is provided', async () => {
			const entity = mock<AgentPublishedVersion>();
			const saved = mock<AgentPublishedVersion>();
			const trxRepo = {
				create: jest.fn().mockReturnValue(entity),
				save: jest.fn().mockResolvedValue(saved),
			};
			const mockTrx = { getRepository: jest.fn().mockReturnValue(trxRepo) };

			jest.spyOn(repository, 'save');

			const result = await repository.savePublishedVersion(payload, mockTrx as never);

			// Uses the trx-scoped repo, not `this`
			expect(repository.save).not.toHaveBeenCalled();
			expect(trxRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({ ...payload, publishedAt: expect.any(Date) }),
			);
			expect(trxRepo.save).toHaveBeenCalledWith(entity);
			expect(result).toBe(saved);
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
