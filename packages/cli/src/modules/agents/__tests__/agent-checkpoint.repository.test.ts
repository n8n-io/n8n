/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { TransactionRunner } from '@n8n/db';
import { MoreThan } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

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

	describe('claimForResume', () => {
		it('claims only the checkpoint row that still has the original suspended state', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as never);

			await expect(
				repository.claimForResume(
					'run-1',
					'agent-1',
					'{"status":"suspended"}',
					'{"status":"running"}',
					new Date(0),
				),
			).resolves.toBe(true);

			expect(repository.update).toHaveBeenCalledWith(
				{
					runId: 'run-1',
					agentId: 'agent-1',
					expired: false,
					state: '{"status":"suspended"}',
					updatedAt: MoreThan(new Date(0)),
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
					new Date(0),
				),
			).resolves.toBe(false);
		});
	});

	describe('cancelSuspended', () => {
		it('matches checkpoints scoped to the current agent', async () => {
			entityManager.update.mockResolvedValue({ affected: 1 } as never);

			await expect(
				repository.cancelSuspended('run-1', 'agent-1', '{"status":"suspended"}'),
			).resolves.toBe(true);

			expect(entityManager.update).toHaveBeenCalledWith(
				AgentCheckpoint,
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
