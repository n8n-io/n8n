/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mockEntityManager } from '@test/mocking';
import type { TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';

const entityManager = mockEntityManager(AgentExecution);
const mockDataSource = { manager: entityManager };

describe('AgentExecutionRepository', () => {
	let repository: AgentExecutionRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentExecutionRepository(mockDataSource as never, mock<TransactionRunner>());
	});

	describe('findLatestSuspendedByThreadId', () => {
		it('finds the most recently suspended execution in the thread', async () => {
			const suspended = { id: 'execution-1', source: 'telegram' } as AgentExecution;
			vi.spyOn(repository, 'findOne').mockResolvedValue(suspended);

			const result = await repository.findLatestSuspendedByThreadId('thread-1');

			expect(repository.findOne).toHaveBeenCalledWith({
				where: { threadId: 'thread-1', hitlStatus: 'suspended' },
				order: { createdAt: 'DESC' },
			});
			expect(result).toBe(suspended);
		});

		it('returns null when the thread has no suspended execution', async () => {
			vi.spyOn(repository, 'findOne').mockResolvedValue(null);

			const result = await repository.findLatestSuspendedByThreadId('thread-1');

			expect(result).toBeNull();
		});
	});

	describe('incrementCost', () => {
		it('is a no-op for zero or negative cost and never issues an UPDATE', async () => {
			const createQueryBuilderSpy = vi
				.spyOn(repository, 'createQueryBuilder')
				.mockReturnValue({} as never);

			await repository.incrementCost('execution-1', 0);
			await repository.incrementCost('execution-1', -1);

			expect(createQueryBuilderSpy).not.toHaveBeenCalled();
		});

		it('issues an atomic cost increment UPDATE for a positive cost', async () => {
			const execute = vi.fn().mockResolvedValue(undefined);
			const qb = {
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				setParameters: vi.fn().mockReturnThis(),
				execute,
			};
			vi.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);

			await repository.incrementCost('execution-1', 0.00125);

			expect(qb.update).toHaveBeenCalledWith(AgentExecution);
			expect(qb.set).toHaveBeenCalledWith({ cost: expect.any(Function) });
			expect(qb.where).toHaveBeenCalledWith('id = :executionId', { executionId: 'execution-1' });
			expect(qb.setParameters).toHaveBeenCalledWith({ cost: 0.00125 });
			expect(execute).toHaveBeenCalledTimes(1);
		});
	});
});
