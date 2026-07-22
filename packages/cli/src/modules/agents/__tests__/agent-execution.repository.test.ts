/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mockEntityManager } from '@test/mocking';

import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';

const entityManager = mockEntityManager(AgentExecution);
const mockDataSource = { manager: entityManager };

describe('AgentExecutionRepository', () => {
	let repository: AgentExecutionRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentExecutionRepository(mockDataSource as never);
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
});
