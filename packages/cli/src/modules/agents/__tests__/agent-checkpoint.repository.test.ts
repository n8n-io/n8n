/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { IsNull } from '@n8n/typeorm';
import { mockEntityManager } from '@test/mocking';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';

const entityManager = mockEntityManager(AgentCheckpoint);
const mockDataSource = { manager: entityManager };

describe('AgentCheckpointRepository', () => {
	let repository: AgentCheckpointRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new AgentCheckpointRepository(mockDataSource as never);
	});

	describe('findByRunIdAndAgentId', () => {
		it('claims cancellation without discarding child checkpoint references', async () => {
			const checkpoint = { runId: 'run-1' } as AgentCheckpoint;
			vi.spyOn(repository, 'findOneBy').mockResolvedValue(checkpoint);

			await expect(repository.findByRunIdAndAgentId('run-1', 'agent-1')).resolves.toBe(checkpoint);

			expect(repository.findOneBy).toHaveBeenCalledWith({ runId: 'run-1', agentId: 'agent-1' });
		});
	});

	describe('active checkpoint lookup', () => {
		it('keeps owned and legacy-unscoped queries separate', async () => {
			vi.spyOn(repository, 'find').mockResolvedValue([]);

			await repository.findActiveByAgentId('agent-1', 5);
			await repository.findActiveLegacyUnscoped();

			expect(repository.find).toHaveBeenNthCalledWith(1, {
				where: { agentId: 'agent-1', expired: false },
				order: { updatedAt: 'DESC' },
				take: 5,
			});
			expect(repository.find).toHaveBeenNthCalledWith(2, {
				where: { agentId: IsNull(), expired: false },
				order: { updatedAt: 'DESC' },
			});
		});
	});

	describe('adoptLegacyCheckpoint', () => {
		it('atomically assigns an active unchanged unscoped checkpoint', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as never);

			await expect(
				repository.adoptLegacyCheckpoint('run-1', 'agent-1', '{"status":"suspended"}'),
			).resolves.toBe(true);

			expect(repository.update).toHaveBeenCalledWith(
				{
					runId: 'run-1',
					agentId: IsNull(),
					expired: false,
					state: '{"status":"suspended"}',
				},
				{ agentId: 'agent-1' },
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
		it('matches only checkpoints scoped to the current agent', async () => {
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

	describe('expireByRunIdAndAgentId', () => {
		it('expires only checkpoints scoped to the current agent', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as never);

			await repository.expireByRunIdAndAgentId('run-1', 'agent-1');

			expect(repository.update).toHaveBeenCalledWith(
				{ runId: 'run-1', agentId: 'agent-1' },
				{ expired: true, state: null },
			);
		});
	});
});
