/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment -- mock-based tests intentionally reference unbound methods and cast mock returns */
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

	describe('savePublishedVersion', () => {
		const payload = {
			agentId: 'agent-1',
			schema: null,
			tools: null,
			skills: null,
			publishedFromVersionId: 'v1',
			model: 'claude-3',
			provider: 'anthropic',
			credentialId: 'cred-1',
			publishedById: 'user-1',
		};

		it('upserts the snapshot and returns the saved entity', async () => {
			const saved = mock<AgentPublishedVersion>();
			jest
				.spyOn(repository, 'upsert')
				.mockResolvedValue({ raw: {}, generatedMaps: [], identifiers: [] });
			jest.spyOn(repository, 'findOneByOrFail').mockResolvedValue(saved);

			const result = await repository.savePublishedVersion(payload);

			expect(repository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ ...payload, updatedAt: expect.any(Date) }),
				['agentId'],
			);
			expect(repository.findOneByOrFail).toHaveBeenCalledWith({ agentId: payload.agentId });
			expect(result).toBe(saved);
		});

		it('uses the transaction-scoped repository when trx is provided', async () => {
			const saved = mock<AgentPublishedVersion>();
			const trxRepo = {
				upsert: jest.fn().mockResolvedValue({ raw: {}, generatedMaps: [], identifiers: [] }),
				findOneByOrFail: jest.fn().mockResolvedValue(saved),
			};
			const mockTrx = { getRepository: jest.fn().mockReturnValue(trxRepo) };

			jest.spyOn(repository, 'upsert');

			const result = await repository.savePublishedVersion(payload, mockTrx as never);

			// Uses the trx-scoped repo, not `this`
			expect(repository.upsert).not.toHaveBeenCalled();
			expect(trxRepo.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ ...payload, updatedAt: expect.any(Date) }),
				['agentId'],
			);
			expect(trxRepo.findOneByOrFail).toHaveBeenCalledWith({ agentId: payload.agentId });
			expect(result).toBe(saved);
		});
	});

	describe('deleteByAgentId', () => {
		it('calls delete with the correct agentId filter', async () => {
			jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

			await repository.deleteByAgentId('agent-1');

			expect(repository.delete).toHaveBeenCalledWith({ agentId: 'agent-1' });
		});

		it('uses the transaction-scoped repository when trx is provided', async () => {
			const trxRepo = { delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }) };
			const mockTrx = { getRepository: jest.fn().mockReturnValue(trxRepo) };

			jest.spyOn(repository, 'delete');

			await repository.deleteByAgentId('agent-1', mockTrx as never);

			expect(repository.delete).not.toHaveBeenCalled();
			expect(trxRepo.delete).toHaveBeenCalledWith({ agentId: 'agent-1' });
		});
	});
});
