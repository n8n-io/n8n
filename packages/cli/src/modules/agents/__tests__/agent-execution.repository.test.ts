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
			await repository.incrementCost('execution-1', 0);
			await repository.incrementCost('execution-1', -1);

			// incrementCost builds the query from the context manager
			// (`managerFor(ctx).createQueryBuilder()`), so the no-op guard
			// must keep it from reaching the entity manager's query builder.
			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
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
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			await repository.incrementCost('execution-1', 0.00125);

			expect(qb.update).toHaveBeenCalledWith(AgentExecution);
			expect(qb.set).toHaveBeenCalledTimes(1);
			// The cost value is a SQL-fragment function; invoke it to verify the
			// accumulating expression. `COALESCE` keeps a nullable `cost` from
			// collapsing to `NULL + :cost = NULL` when no main-turn usage is priced.
			const setArg = qb.set.mock.calls[0][0] as { cost: () => string };
			expect(typeof setArg.cost).toBe('function');
			expect(setArg.cost()).toBe('COALESCE(cost, 0) + :cost');
			expect(qb.where).toHaveBeenCalledWith('id = :executionId', { executionId: 'execution-1' });
			expect(qb.setParameters).toHaveBeenCalledWith({ cost: 0.00125 });
			expect(execute).toHaveBeenCalledTimes(1);
		});
	});

	describe('updateIfRunning', () => {
		it('folds a positive costIncrement into the terminal UPDATE as an additive fragment', async () => {
			const execute = vi.fn().mockResolvedValue({ affected: 1 });
			const qb = {
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				setParameters: vi.fn().mockReturnThis(),
				execute,
			};
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			const result = await repository.updateIfRunning(
				'execution-1',
				{
					status: 'success',
					stoppedAt: new Date('2026-01-01'),
					duration: 1000,
					timeline: null,
					storedAt: 'db',
					error: null,
					failureSummary: null,
				},
				undefined,
				{},
				0.05,
			);

			expect(result).toBe(true);
			expect(qb.update).toHaveBeenCalledWith(AgentExecution);
			expect(qb.set).toHaveBeenCalledTimes(1);
			// `cost` is a SQL-fragment function so the increment is additive and
			// cannot overwrite a side-call `incrementCost` that landed earlier.
			const setArg = qb.set.mock.calls[0][0] as { cost: () => string; status: string };
			expect(typeof setArg.cost).toBe('function');
			expect(setArg.cost()).toBe('COALESCE(cost, 0) + :costIncrement');
			expect(qb.where).toHaveBeenCalledWith('id = :executionId', { executionId: 'execution-1' });
			expect(qb.andWhere).toHaveBeenCalledWith('status = :status', { status: 'running' });
			expect(qb.setParameters).toHaveBeenCalledWith({
				executionId: 'execution-1',
				status: 'running',
				costIncrement: 0.05,
			});
			expect(execute).toHaveBeenCalledTimes(1);
		});

		it('omits the cost fragment when no costIncrement is given', async () => {
			const execute = vi.fn().mockResolvedValue({ affected: 1 });
			const qb = {
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				setParameters: vi.fn().mockReturnThis(),
				execute,
			};
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			await repository.updateIfRunning(
				'execution-1',
				{
					status: 'success',
					stoppedAt: new Date('2026-01-01'),
					duration: 1000,
					timeline: null,
					storedAt: 'db',
					error: null,
					failureSummary: null,
				},
				undefined,
				{},
				undefined,
			);

			const setArg = qb.set.mock.calls[0][0] as { cost?: () => string };
			expect(setArg.cost).toBeUndefined();
			expect(qb.setParameters).toHaveBeenCalledWith({
				executionId: 'execution-1',
				status: 'running',
			});
		});
	});
});
