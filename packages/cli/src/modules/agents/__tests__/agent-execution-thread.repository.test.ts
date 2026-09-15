/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';

const entityManager = mockEntityManager(AgentExecutionThread);
const mockDataSource = { manager: entityManager };

describe('AgentExecutionThreadRepository', () => {
	let repository: AgentExecutionThreadRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentExecutionThreadRepository(mockDataSource as never);
	});

	describe('findOrCreate', () => {
		const makeScopedRepository = (saved: AgentExecutionThread, max = 7) => ({
			findOneBy: vi.fn().mockResolvedValue(null),
			createQueryBuilder: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				getRawOne: vi.fn().mockResolvedValue({ max }),
			}),
			create: vi.fn().mockReturnValue(saved),
			save: vi.fn().mockResolvedValue(saved),
		});

		it('assigns the project-scoped session number inside a serializable transaction', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			const trx = { getRepository: vi.fn().mockReturnValue(scopedRepository) };
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
				taskId: null,
				taskVersionId: null,
				sessionNumber: 8,
				parentThreadId: null,
				parentAgentId: null,
			});
			expect(result).toEqual({ thread: saved, created: true });
		});

		it('stores subagent origin metadata when creating a thread', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			const trx = { getRepository: vi.fn().mockReturnValue(scopedRepository) };
			entityManager.transaction.mockImplementationOnce(async (_isolation, callback) => {
				return await callback(trx as never);
			});

			await repository.findOrCreate('thread-1', 'agent-1', 'Support agent', 'project-1', {
				parentThreadId: 'parent-thread-1',
				parentAgentId: 'parent-agent-1',
			});

			expect(scopedRepository.create).toHaveBeenCalledWith({
				id: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Support agent',
				projectId: 'project-1',
				taskId: null,
				taskVersionId: null,
				sessionNumber: 8,
				parentThreadId: 'parent-thread-1',
				parentAgentId: 'parent-agent-1',
			});
		});

		it('stores the published task snapshot version when supplied', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			const trx = { getRepository: vi.fn().mockReturnValue(scopedRepository) };
			entityManager.transaction.mockImplementationOnce(async (_isolation, callback) => {
				return await callback(trx as never);
			});

			await repository.findOrCreate(
				'thread-1',
				'agent-1',
				'Support agent',
				'project-1',
				undefined,
				'task-1',
				'version-1',
			);

			expect(scopedRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: 'task-1',
					taskVersionId: 'version-1',
				}),
			);
		});

		it('retries transient serialization failures before assigning a session number', async () => {
			const saved = mock<AgentExecutionThread>({ id: 'thread-1', sessionNumber: 8 });
			const scopedRepository = makeScopedRepository(saved);
			const trx = { getRepository: vi.fn().mockReturnValue(scopedRepository) };
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
