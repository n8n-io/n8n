/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mockEntityManager } from '@test/mocking';
import type { TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';

const entityManager = mockEntityManager(AgentCheckpoint);
const mockDataSource = { manager: entityManager };

describe('AgentCheckpointRepository', () => {
	let repository: AgentCheckpointRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentCheckpointRepository(mockDataSource as never, mock<TransactionRunner>());
	});

	describe('saveCheckpoint', () => {
		const input = {
			runId: 'run-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
			state: '{"status":"suspended"}',
		};

		it('rejects a checkpoint owned by a different agent', async () => {
			entityManager.findOneBy.mockResolvedValue(
				mock<AgentCheckpoint>({ runId: 'run-1', agentId: 'agent-2', expired: false }),
			);

			await expect(repository.saveCheckpoint(input)).rejects.toThrow('different agent');
			expect(entityManager.update).not.toHaveBeenCalled();
		});

		it('does not reactivate an expired checkpoint', async () => {
			entityManager.findOneBy.mockResolvedValue(
				mock<AgentCheckpoint>({ runId: 'run-1', agentId: 'agent-1', expired: true }),
			);

			await expect(repository.saveCheckpoint(input)).rejects.toThrow('expired');
			expect(entityManager.update).not.toHaveBeenCalled();
		});

		it('rejects an update that loses a concurrent expiry', async () => {
			entityManager.findOneBy.mockResolvedValue(
				mock<AgentCheckpoint>({ runId: 'run-1', agentId: 'agent-1', expired: false }),
			);
			entityManager.update.mockResolvedValue({ affected: 0 } as never);

			await expect(repository.saveCheckpoint(input)).rejects.toThrow('expired');
			expect(entityManager.update).toHaveBeenCalledWith(
				AgentCheckpoint,
				{ runId: 'run-1', agentId: 'agent-1', expired: false },
				{ threadId: 'thread-1', state: input.state },
			);
		});
	});

	describe('claimForResume', () => {
		it('claims only the checkpoint row that still has the original suspended state', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as never);

			await expect(
				repository.claimForResume(
					'run-1',
					'agent-1',
					'{"status":"suspended"}',
					'{"status":"running"}',
				),
			).resolves.toBe(true);

			expect(repository.update).toHaveBeenCalledWith(
				{
					runId: 'run-1',
					agentId: 'agent-1',
					expired: false,
					state: '{"status":"suspended"}',
				},
				{ state: '{"status":"running"}' },
			);
		});

		it('returns false when another process already changed the checkpoint state', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 0 } as never);

			await expect(
				repository.claimForResume(
					'run-1',
					'agent-1',
					'{"status":"suspended"}',
					'{"status":"running"}',
				),
			).resolves.toBe(false);
		});
	});

	describe('cancelSuspended', () => {
		it('matches checkpoints scoped to the current agent', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as never);

			await expect(
				repository.cancelSuspended('run-1', 'agent-1', '{"status":"suspended"}'),
			).resolves.toBe(true);

			expect(repository.update).toHaveBeenCalledWith(
				{
					runId: 'run-1',
					agentId: 'agent-1',
					expired: false,
					state: '{"status":"suspended"}',
				},
				{ expired: true },
			);
		});
	});
});
