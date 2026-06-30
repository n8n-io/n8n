/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
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

	describe('claimForResume', () => {
		it('claims only the checkpoint row that still has the original suspended state', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as never);

			await expect(
				repository.claimForResume('run-1', '{"status":"suspended"}', '{"status":"running"}'),
			).resolves.toBe(true);

			expect(repository.update).toHaveBeenCalledWith(
				{ runId: 'run-1', expired: false, state: '{"status":"suspended"}' },
				{ state: '{"status":"running"}' },
			);
		});

		it('returns false when another process already changed the checkpoint state', async () => {
			vi.spyOn(repository, 'update').mockResolvedValue({ affected: 0 } as never);

			await expect(
				repository.claimForResume('run-1', '{"status":"suspended"}', '{"status":"running"}'),
			).resolves.toBe(false);
		});
	});
});
