/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'jest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';

const entityManager = mockEntityManager(AgentExecutionThread);
const mockDataSource = { manager: entityManager };

describe('AgentExecutionThreadRepository', () => {
	let repository: AgentExecutionThreadRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = new AgentExecutionThreadRepository(mockDataSource as never);
	});

	describe('findOrCreate', () => {
		const makeScopedRepository = (saved: AgentExecutionThread, max = 7) => ({
			findOneBy: jest.fn().mockResolvedValue(null),
			createQueryBuilder: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getRawOne: jest.fn().mockResolvedValue({ max }),
			}),
			create: jest.fn().mockReturnValue(saved),
			save: jest.fn().mockResolvedValue(saved),
		});

		it('assigns the project-scoped session number inside a serializable transaction', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			const trx = { getRepository: jest.fn().mockReturnValue(scopedRepository) };
			entityManager.transaction.mockImplementationOnce(async (_isolation, callback) => {
				return await callback(trx as never);
			});

			const result = await repository.findOrCreate(
				'thread-1',
				'agent-1',
				'Support agent',
				'project-1',
			);

			expect(entityManager.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
			expect(trx.getRepository).toHaveBeenCalledWith(AgentExecutionThread);
			expect(scopedRepository.create).toHaveBeenCalledWith({
				id: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Support agent',
				projectId: 'project-1',
				sessionNumber: 8,
			});
			expect(result).toEqual({ thread: saved, created: true });
		});

		it('retries transient serialization failures before assigning a session number', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			const trx = { getRepository: jest.fn().mockReturnValue(scopedRepository) };
			const serializationError = Object.assign(new Error('serialization failure'), {
				driverError: { code: '40001' },
			});
			entityManager.transaction
				.mockRejectedValueOnce(serializationError)
				.mockImplementationOnce(async (_isolation, callback) => {
					return await callback(trx as never);
				});

			const result = await repository.findOrCreate(
				'thread-1',
				'agent-1',
				'Support agent',
				'project-1',
			);

			expect(entityManager.transaction).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ thread: saved, created: true });
		});
	});
});
