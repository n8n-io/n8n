import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { EgressBlockedDestination } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { EgressBlockedDestinationRepository } from '../egress-blocked-destination.repository';

describe('EgressBlockedDestinationRepository', () => {
	const entityManager = mockEntityManager(EgressBlockedDestination);
	const globalConfig = mockInstance(GlobalConfig);
	Object.assign(entityManager.connection, { driver: { escape: (name: string) => `"${name}"` } });

	const repository = Container.get(EgressBlockedDestinationRepository);

	beforeEach(() => {
		vi.resetAllMocks();
		Object.assign(globalConfig, { database: { type: 'sqlite', tablePrefix: '' } });
		// recordBlocks runs its upserts inside a transaction; run the callback against
		// the same mocked manager so query assertions below keep working.
		const transaction = entityManager.transaction as unknown as ReturnType<typeof vi.fn>;
		transaction.mockImplementation(
			async (runInTransaction: (em: typeof entityManager) => Promise<unknown>) =>
				await runInTransaction(entityManager),
		);
	});

	describe('recordBlocks', () => {
		it('is a no-op for an empty batch', async () => {
			await repository.recordBlocks([]);
			expect(entityManager.query).not.toHaveBeenCalled();
		});

		it('upserts each destination on sqlite, incrementing count', async () => {
			await repository.recordBlocks([
				{
					hostname: 'evil.example.com',
					resolvedIp: '10.0.0.1',
					feature: 'http-request',
					decision: 'blocked',
					count: 3,
				},
			]);

			expect(entityManager.query).toHaveBeenCalledTimes(1);
			const [sql, params] = entityManager.query.mock.calls[0];
			expect(sql).toContain('INSERT INTO "egress_blocked_destination"');
			expect(sql).toContain('ON CONFLICT ("hostname", "resolvedIp", "feature", "decision")');
			expect(sql).toContain('"count" = "count" + ?');
			// sqlite uses positional params; count appears for both insert and increment
			expect(params).toEqual(['evil.example.com', '10.0.0.1', 'http-request', 'blocked', 3, 3]);
		});

		it('uses postgres upsert syntax when on postgres', async () => {
			Object.assign(globalConfig, { database: { type: 'postgresdb', tablePrefix: '' } });

			await repository.recordBlocks([
				{
					hostname: '',
					resolvedIp: '169.254.169.254',
					feature: 'webhook',
					decision: 'would-block',
					count: 1,
				},
			]);

			const [sql, params] = entityManager.query.mock.calls[0];
			expect(sql).toContain('ON CONFLICT ("hostname", "resolvedIp", "feature", "decision")');
			expect(sql).toContain('"count" + $5');
			expect(params).toEqual(['', '169.254.169.254', 'webhook', 'would-block', 1]);
		});

		it('respects the table prefix', async () => {
			Object.assign(globalConfig, { database: { type: 'sqlite', tablePrefix: 'n8n_' } });

			await repository.recordBlocks([
				{ hostname: 'h', resolvedIp: '10.0.0.2', feature: 'oauth', decision: 'blocked', count: 1 },
			]);

			const [sql] = entityManager.query.mock.calls[0];
			expect(sql).toContain('INSERT INTO "n8n_egress_blocked_destination"');
		});
	});
});
