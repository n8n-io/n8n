import type { DeleteResult, EntityManager, Repository } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiPendingConfirmation } from '../../entities/instance-ai-pending-confirmation.entity';
import { InstanceAiPendingConfirmationRepository } from '../instance-ai-pending-confirmation.repository';

function makeRow(
	overrides: Partial<InstanceAiPendingConfirmation> = {},
): InstanceAiPendingConfirmation {
	return {
		requestId: 'req-1',
		threadId: 'thread-1',
		userId: 'user-1',
		kind: 'inline',
		runId: 'run-1',
		toolCallId: null,
		messageGroupId: null,
		checkpoint: null,
		checkpointKey: null,
		checkpointTaskId: null,
		expiresAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as InstanceAiPendingConfirmation;
}

describe('InstanceAiPendingConfirmationRepository.claim', () => {
	function buildRepoWithTxRepo(txRepo: Repository<InstanceAiPendingConfirmation>) {
		const manager = mock<EntityManager>();
		manager.getRepository.mockReturnValue(
			txRepo as unknown as Repository<InstanceAiPendingConfirmation>,
		);
		(manager as unknown as { connection: { options: { type: string } } }).connection = {
			options: { type: 'sqlite' },
		};

		const outerManager = {
			transaction: vi.fn(async (cb: (m: EntityManager) => Promise<unknown>) => await cb(manager)),
		};

		const repo = Object.create(
			InstanceAiPendingConfirmationRepository.prototype,
		) as InstanceAiPendingConfirmationRepository;
		Object.defineProperty(repo, 'manager', {
			value: outerManager,
			configurable: true,
		});
		return { repo, outerManager };
	}

	it('returns the row to the caller that wins the delete', async () => {
		const row = makeRow();
		const txRepo = mock<Repository<InstanceAiPendingConfirmation>>();
		txRepo.findOne.mockResolvedValueOnce(row);
		txRepo.delete.mockResolvedValueOnce({ affected: 1 } as DeleteResult);
		const { repo } = buildRepoWithTxRepo(txRepo);

		const result = await repo.claim('req-1', 'user-1');

		expect(result).toBe(row);
		expect(txRepo.findOne).toHaveBeenCalledWith({
			where: expect.objectContaining({ requestId: 'req-1', userId: 'user-1' }),
		});
		expect(txRepo.delete).toHaveBeenCalledWith(
			expect.objectContaining({ requestId: 'req-1', userId: 'user-1' }),
		);
	});

	it('returns undefined when no row matches the requestId+userId', async () => {
		const txRepo = mock<Repository<InstanceAiPendingConfirmation>>();
		txRepo.findOne.mockResolvedValueOnce(null);
		const { repo } = buildRepoWithTxRepo(txRepo);

		const result = await repo.claim('req-missing', 'user-1');

		expect(result).toBeUndefined();
		expect(txRepo.delete).not.toHaveBeenCalled();
	});

	it('returns undefined when a concurrent delete claimed the row first', async () => {
		const txRepo = mock<Repository<InstanceAiPendingConfirmation>>();
		txRepo.findOne.mockResolvedValueOnce(makeRow());
		txRepo.delete.mockResolvedValueOnce({ affected: 0 } as DeleteResult);
		const { repo } = buildRepoWithTxRepo(txRepo);

		const result = await repo.claim('req-1', 'user-1');

		expect(result).toBeUndefined();
	});

	it('scopes by userId so a different user cannot take the row', async () => {
		const txRepo = mock<Repository<InstanceAiPendingConfirmation>>();
		txRepo.findOne.mockResolvedValueOnce(null);
		const { repo } = buildRepoWithTxRepo(txRepo);

		const result = await repo.claim('req-1', 'attacker-user');

		expect(result).toBeUndefined();
		expect(txRepo.findOne).toHaveBeenCalledWith({
			where: expect.objectContaining({ requestId: 'req-1', userId: 'attacker-user' }),
		});
	});

	it('treats expired rows as already gone — same predicate as findLiveRequestIds', async () => {
		// Driver behavior: an expired row would not match the live-where
		// predicate, so findOne returns null even though the row physically
		// exists. The expired-prune sweep is responsible for the physical row
		// — the claim path treats it as unclaimable in the meantime.
		const txRepo = mock<Repository<InstanceAiPendingConfirmation>>();
		txRepo.findOne.mockResolvedValueOnce(null);
		const { repo } = buildRepoWithTxRepo(txRepo);

		const result = await repo.claim('req-expired', 'user-1');

		expect(result).toBeUndefined();
		expect(txRepo.delete).not.toHaveBeenCalled();
		const where = (txRepo.findOne.mock.calls[0][0] as { where: Record<string, unknown> }).where;
		expect(where).toHaveProperty('expiresAt');
	});
});
