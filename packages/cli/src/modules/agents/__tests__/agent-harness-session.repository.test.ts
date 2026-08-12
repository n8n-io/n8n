import type {
	DataSource,
	InsertQueryBuilder,
	SelectQueryBuilder,
	UpdateQueryBuilder,
} from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { AgentHarnessSession } from '../entities/agent-harness-session.entity';
import { AgentHarnessSessionRepository } from '../repositories/agent-harness-session.repository';

function updateQueryBuilder() {
	const root = mock<SelectQueryBuilder<AgentHarnessSession>>();
	const builder = mock<UpdateQueryBuilder<AgentHarnessSession>>();
	root.update.mockReturnValue(builder);
	builder.set.mockReturnValue(builder);
	builder.where.mockReturnValue(builder);
	builder.andWhere.mockReturnValue(builder);
	return { root, builder };
}

function insertQueryBuilder() {
	const root = mock<SelectQueryBuilder<AgentHarnessSession>>();
	const builder = mock<InsertQueryBuilder<AgentHarnessSession>>();
	root.insert.mockReturnValue(builder);
	builder.into.mockReturnValue(builder);
	builder.values.mockReturnValue(builder);
	builder.orIgnore.mockReturnValue(builder);
	return { root, builder };
}

const key = {
	agentId: 'agent-1',
	threadId: 'thread-1',
	runtimeIdentity: 'identity-1',
};

const options = {
	adapter: 'claude-code',
	resourceId: 'resource-1',
	sessionId: 'sandbox-1',
	claimToken: 'claim-2',
	claimTtlMs: 60_000,
	sessionTtlMs: 600_000,
};

describe('AgentHarnessSessionRepository', () => {
	it('takes over an expired claim by incrementing its fencing epoch', async () => {
		const repository = new AgentHarnessSessionRepository(mock<DataSource>());
		const updateQuery = updateQueryBuilder();
		updateQuery.builder.execute.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });
		vi.spyOn(repository, 'createQueryBuilder').mockReturnValueOnce(updateQuery.root);
		const claimed = { ...key, ...options, ownershipEpoch: 4 } as unknown as AgentHarnessSession;
		vi.spyOn(repository, 'findOneBy').mockResolvedValue(claimed);

		await expect(repository.acquire(key, options)).resolves.toBe(claimed);
		expect(updateQuery.builder.set).toHaveBeenCalledWith(
			expect.objectContaining({
				claimToken: 'claim-2',
				ownershipEpoch: expect.any(Function),
			}),
		);
		expect(updateQuery.builder.andWhere).toHaveBeenCalledWith(
			'("status" = :idle OR "claimExpiresAt" <= :now)',
			expect.objectContaining({ idle: 'idle' }),
		);
	});

	it('returns no claim when a concurrent insert wins', async () => {
		const repository = new AgentHarnessSessionRepository(mock<DataSource>());
		const updateQuery = updateQueryBuilder();
		const insertQuery = insertQueryBuilder();
		updateQuery.builder.execute.mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });
		insertQuery.builder.execute.mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] });
		vi.spyOn(repository, 'createQueryBuilder')
			.mockReturnValueOnce(updateQuery.root)
			.mockReturnValueOnce(insertQuery.root);
		vi.spyOn(repository, 'findOneBy').mockResolvedValue(null);

		await expect(repository.acquire(key, options)).resolves.toBeNull();
		expect(insertQuery.builder.orIgnore).toHaveBeenCalledOnce();
	});

	it('rejects stale state writes using both the epoch and claim token', async () => {
		const repository = new AgentHarnessSessionRepository(mock<DataSource>());
		const update = vi
			.spyOn(repository, 'update')
			.mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });
		const handle = { ...key, claimToken: 'stale-token', ownershipEpoch: 2 };

		await expect(
			repository.saveClaimedState(
				handle,
				{ sessionId: 'sandbox-1', serializedState: null },
				600_000,
			),
		).resolves.toBe(false);
		expect(update).toHaveBeenCalledWith(
			{ ...handle, status: 'claimed' },
			expect.objectContaining({ sessionId: 'sandbox-1' }),
		);
	});
});
