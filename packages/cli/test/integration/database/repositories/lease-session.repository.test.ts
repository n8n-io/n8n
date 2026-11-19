import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { NewLeaseSession } from '@n8n/db';
import {
	dbNowLiteral,
	LeaseKind,
	LeaseSession,
	LeaseSessionRepository,
	parseDbTime,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

describe('LeaseSessionRepository', () => {
	let repository: LeaseSessionRepository;

	const findRow = async (id: string) =>
		await Container.get(DataSource).getRepository(LeaseSession).findOneBy({ id });

	const readDbNow = async () => {
		const isPostgres = Container.get(GlobalConfig).database.type === 'postgresdb';
		const [row]: { dbNow: Date | string }[] = await Container.get(DataSource).query(
			`SELECT ${dbNowLiteral(isPostgres)} AS "dbNow"`,
		);
		return parseDbTime(row.dbNow).getTime();
	};

	const newSession = (leaseDurationSeconds: number): NewLeaseSession => ({
		id: randomUUID(),
		leaseKind: 'test-kind',
		hostId: 'host-1',
		bootId: randomUUID(),
		leaseDurationSeconds,
	});

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(LeaseSessionRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['LeaseSession', 'LeaseKind']);
		await Container.get(DataSource).getRepository(LeaseKind).insert({ kind: 'test-kind' });
		vi.useFakeTimers({ toFake: ['Date'], now: new Date('2000-01-01T00:00:00Z') });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('inserts a session that expires one lease length after the database time of the insert', async () => {
		const session = newSession(20);

		const dbBefore = await readDbNow();
		await repository.insertSession(session, {});
		const dbAfter = await readDbNow();

		const row = await findRow(session.id);
		expect(row).toMatchObject(session);
		expect(row!.expiresAt.getTime()).toBeGreaterThanOrEqual(dbBefore + 20_000);
		expect(row!.expiresAt.getTime()).toBeLessThanOrEqual(dbAfter + 20_000);
	});

	it('extends a live session to one lease length after the database time of the renewal', async () => {
		const session = newSession(20);
		await repository.insertSession(session, {});

		const dbBefore = await readDbNow();
		const renewed = await repository.renewLive(session.id, 20, {});
		const dbAfter = await readDbNow();

		const row = await findRow(session.id);
		expect(renewed).toBe(true);
		expect(row!.expiresAt.getTime()).toBeGreaterThanOrEqual(dbBefore + 20_000);
		expect(row!.expiresAt.getTime()).toBeLessThanOrEqual(dbAfter + 20_000);
	});

	it('leaves an expired session unchanged and reports failure', async () => {
		const session = newSession(20);
		await repository.insertSession(session, {});
		await Container.get(DataSource)
			.getRepository(LeaseSession)
			.update({ id: session.id }, { expiresAt: new Date(Date.now() + 60_000) });
		const before = await findRow(session.id);

		const renewed = await repository.renewLive(session.id, 20, {});

		const after = await findRow(session.id);
		expect(renewed).toBe(false);
		expect(after!.expiresAt).toEqual(before!.expiresAt);
	});

	it('deletes a session', async () => {
		const session = newSession(20);
		await repository.insertSession(session, {});

		await repository.deleteSession(session.id, {});

		expect(await findRow(session.id)).toBeNull();
	});
});
