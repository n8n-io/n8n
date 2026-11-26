import { testDb } from '@n8n/backend-test-utils';
import { LeaseKind, LeaseKindRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

describe('LeaseKindRepository', () => {
	let repository: LeaseKindRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(LeaseKindRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['LeaseSession', 'LeaseKind']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('keeps one row and its counter when the same kind is inserted twice', async () => {
		await repository.insertIfMissing('test-kind', {});
		await Container.get(DataSource)
			.getRepository(LeaseKind)
			.update({ kind: 'test-kind' }, { fencingTokenCounter: 7 });

		await repository.insertIfMissing('test-kind', {});

		const rows = await Container.get(DataSource).getRepository(LeaseKind).find();
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			kind: 'test-kind',
			fencingTokenCounter: 7,
			syncLockRoundId: null,
			syncLockExpiresAt: null,
			lastFullSyncAt: null,
		});
	});
});
