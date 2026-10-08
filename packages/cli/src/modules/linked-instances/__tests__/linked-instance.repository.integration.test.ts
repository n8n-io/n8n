import { randomUUID } from 'node:crypto';

import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { UserRepository, wrapMigration, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type QueryRunner } from '@n8n/typeorm';
import { createUser } from '@test-integration/db/users';

import {
	LinkedInstanceRepository,
	type NewLinkedInstance,
} from '../database/repositories/linked-instance.repository';

const MIGRATION_NAME = 'CreateLinkedInstanceTable1791401960379';
const COLUMNS_MIGRATION_NAME = 'AddDefaultRemoteProjectToLinkedInstance1791416459011';

let repository: LinkedInstanceRepository;
let alice: User;
let bob: User;

const newLink = (
	userId: string,
	overrides: Partial<NewLinkedInstance> = {},
): NewLinkedInstance => ({
	userId,
	name: 'Cloud',
	baseUrl: 'https://acme.app.n8n.cloud',
	tokenEncrypted: 'ciphertext',
	status: 'online',
	lastVerifiedAt: new Date('2026-10-07T12:00:00.000Z'),
	...overrides,
});

async function createLink(userId: string, overrides: Partial<NewLinkedInstance> = {}) {
	const link = await repository.createForUser(newLink(userId, overrides));
	if (!link) throw new Error('The test link was not created');
	return link;
}

const ID_1 = '10000000-0000-4000-8000-000000000000';
const ID_2 = '20000000-0000-4000-8000-000000000000';
const ID_3 = '30000000-0000-4000-8000-000000000000';
const ID_4 = '40000000-0000-4000-8000-000000000000';

// A fixed id and time, so the order checks do not depend on random ids or on the clock.
async function insertLinkAt(userId: string, id: string, createdAt: string) {
	await repository.insert({
		...newLink(userId, { baseUrl: `https://${id}.example` }),
		id,
		createdAt: new Date(createdAt),
	});
}

beforeAll(async () => {
	await testModules.loadModules(['linked-instances']);
	await testDb.init();
	repository = Container.get(LinkedInstanceRepository);
});

beforeEach(async () => {
	await repository.delete({});
	await testDb.truncate(['User']);
	alice = await createUser();
	bob = await createUser();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('LinkedInstanceRepository', () => {
	it('stores a link with a generated id and timestamps, and returns the stored row', async () => {
		const before = Date.now() - 1000;
		const link = await createLink(alice.id);

		const row = await repository.findForUser(alice.id, link.id);
		expect(row).toMatchObject({
			id: expect.stringMatching(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
			),
			userId: alice.id,
			name: 'Cloud',
			baseUrl: 'https://acme.app.n8n.cloud',
			tokenEncrypted: 'ciphertext',
			status: 'online',
			lastVerifiedAt: new Date('2026-10-07T12:00:00.000Z'),
		});
		expect(row?.createdAt.getTime()).toBeGreaterThanOrEqual(before);
		// The returned row holds the timestamps that the database set.
		expect(link.createdAt).toEqual(row?.createdAt);
		expect(link.updatedAt).toEqual(row?.updatedAt);
	});

	it("gives a row without a status the status 'unknown'", async () => {
		const id = randomUUID();
		const { tablePrefix } = Container.get(GlobalConfig).database;
		const dataSource = Container.get(DataSource);
		const table = dataSource.driver.escape(`${tablePrefix}linked_instance`);
		// Raw SQL, so the default comes from the migration and not from the entity.
		await dataSource.query(
			`INSERT INTO ${table} ("id", "userId", "name", "baseUrl", "tokenEncrypted") ` +
				`VALUES ('${id}', '${alice.id}', 'Cloud', 'https://acme.app.n8n.cloud', 'ciphertext')`,
		);

		await expect(repository.findForUser(alice.id, id)).resolves.toMatchObject({
			status: 'unknown',
			lastVerifiedAt: null,
		});
	});

	it('allows each user to link an address only once', async () => {
		await createLink(alice.id);

		await expect(repository.createForUser(newLink(alice.id, { name: 'Again' }))).resolves.toBe(
			null,
		);
		await expect(repository.createForUser(newLink(bob.id))).resolves.not.toBe(null);
		expect(await repository.count()).toBe(2);
	});

	it('rejects a link for a user that does not exist', async () => {
		await expect(repository.createForUser(newLink(randomUUID()))).rejects.toThrow();
	});

	it("lists only the user's links, oldest first", async () => {
		// The time order differs from the id order and from the insert order.
		await insertLinkAt(alice.id, ID_2, '2026-10-03T12:00:00.000Z');
		await insertLinkAt(bob.id, ID_4, '2026-10-01T12:00:00.000Z');
		await insertLinkAt(alice.id, ID_1, '2026-10-02T12:00:00.000Z');
		await insertLinkAt(alice.id, ID_3, '2026-10-01T12:00:00.000Z');

		const links = await repository.listForUser(alice.id);

		expect(links.map(({ id }) => id)).toEqual([ID_3, ID_1, ID_2]);
		await expect(repository.listForUser(randomUUID())).resolves.toEqual([]);
	});

	it('lists links with the same creation time in id order', async () => {
		for (const id of [ID_2, ID_3, ID_1]) {
			await insertLinkAt(alice.id, id, '2026-10-07T12:00:00.000Z');
		}

		const links = await repository.listForUser(alice.id);

		expect(links.map(({ id }) => id)).toEqual([ID_1, ID_2, ID_3]);
	});

	it("finds and checks only the user's links", async () => {
		const link = await createLink(alice.id);

		await expect(repository.findForUser(bob.id, link.id)).resolves.toBeNull();
		await expect(repository.existsForUser(alice.id, link.baseUrl)).resolves.toBe(true);
		await expect(repository.existsForUser(bob.id, link.baseUrl)).resolves.toBe(false);
		await expect(repository.existsForUser(alice.id, 'https://other.example')).resolves.toBe(false);
	});

	it("deletes only the user's link", async () => {
		const link = await createLink(alice.id);

		await expect(repository.deleteForUser(bob.id, link.id)).resolves.toBe(false);
		await expect(repository.findForUser(alice.id, link.id)).resolves.not.toBeNull();

		await expect(repository.deleteForUser(alice.id, link.id)).resolves.toBe(true);
		await expect(repository.findForUser(alice.id, link.id)).resolves.toBeNull();
		await expect(repository.deleteForUser(alice.id, link.id)).resolves.toBe(false);
	});

	it('stores the default remote project, and leaves it empty when not given', async () => {
		const withProject = await createLink(alice.id, {
			defaultRemoteProjectId: 'Xk3pQ9aZ1bC2dE4f',
			defaultRemoteProjectName: 'Ops',
		});
		const withoutProject = await createLink(alice.id, { baseUrl: 'http://localhost:5678' });

		await expect(repository.findForUser(alice.id, withProject.id)).resolves.toMatchObject({
			defaultRemoteProjectId: 'Xk3pQ9aZ1bC2dE4f',
			defaultRemoteProjectName: 'Ops',
		});
		await expect(repository.findForUser(alice.id, withoutProject.id)).resolves.toMatchObject({
			defaultRemoteProjectId: null,
			defaultRemoteProjectName: null,
		});
	});

	it("updates only the given columns of only the user's link", async () => {
		const link = await createLink(alice.id, {
			defaultRemoteProjectId: 'Xk3pQ9aZ1bC2dE4f',
			defaultRemoteProjectName: 'Ops',
		});
		const otherLink = await createLink(alice.id, { baseUrl: 'http://localhost:5678' });

		await expect(repository.updateForUser(bob.id, link.id, { name: 'Taken' })).resolves.toBe(false);
		await expect(
			repository.updateForUser(alice.id, link.id, {
				name: 'Cloud EU',
				tokenEncrypted: 'new ciphertext',
				defaultRemoteProjectId: null,
				defaultRemoteProjectName: null,
			}),
		).resolves.toBe(true);

		await expect(repository.findForUser(alice.id, link.id)).resolves.toMatchObject({
			name: 'Cloud EU',
			baseUrl: 'https://acme.app.n8n.cloud',
			tokenEncrypted: 'new ciphertext',
			status: 'online',
			lastVerifiedAt: new Date('2026-10-07T12:00:00.000Z'),
			defaultRemoteProjectId: null,
			defaultRemoteProjectName: null,
		});
		await expect(repository.findForUser(alice.id, otherLink.id)).resolves.toMatchObject({
			name: 'Cloud',
			tokenEncrypted: 'ciphertext',
		});
	});

	it('reports whether the link exists when an update has no values', async () => {
		const link = await createLink(alice.id);

		await expect(repository.updateForUser(alice.id, link.id, {})).resolves.toBe(true);
		await expect(repository.updateForUser(bob.id, link.id, {})).resolves.toBe(false);
	});

	it("updates the status of only the user's link", async () => {
		const link = await createLink(alice.id);
		const checkedAt = new Date('2026-10-08T08:30:00.000Z');

		await expect(repository.updateStatus(bob.id, link.id, 'offline', checkedAt)).resolves.toBe(
			false,
		);
		await expect(repository.findForUser(alice.id, link.id)).resolves.toMatchObject({
			status: 'online',
		});

		await expect(
			repository.updateStatus(alice.id, link.id, 'unauthorised', checkedAt),
		).resolves.toBe(true);
		await expect(repository.findForUser(alice.id, link.id)).resolves.toMatchObject({
			status: 'unauthorised',
			lastVerifiedAt: checkedAt,
		});
	});

	it('removes the links of a user when the user is deleted', async () => {
		await createLink(alice.id);
		await createLink(alice.id, { baseUrl: 'http://localhost:5678' });
		const bobLink = await createLink(bob.id);

		await Container.get(UserRepository).delete({ id: alice.id });

		await expect(repository.listForUser(alice.id)).resolves.toEqual([]);
		await expect(repository.listForUser(bob.id)).resolves.toEqual([
			expect.objectContaining({ id: bobLink.id }),
		]);
	});
});

type MigrationRow = { name: string };
type WrappedMigration = new () => {
	up(queryRunner: QueryRunner): Promise<void>;
	down(queryRunner: QueryRunner): Promise<void>;
};

describe('linked_instance migrations', () => {
	async function withQueryRunner(fn: (queryRunner: QueryRunner) => Promise<void>) {
		const queryRunner = Container.get(DataSource).createQueryRunner();
		try {
			await fn(queryRunner);
		} finally {
			await queryRunner.release();
		}
	}

	async function loadMigration(name: string) {
		const dataSource = Container.get(DataSource);
		const { tablePrefix } = Container.get(GlobalConfig).database;
		const executed = await dataSource.query<MigrationRow[]>(
			`SELECT name FROM ${dataSource.driver.escape(`${tablePrefix}migrations`)}`,
		);
		expect(executed.map((row) => row.name)).toContain(name);

		const MigrationClass = (dataSource.options.migrations as WrappedMigration[]).find(
			(migration) => migration.name === name,
		);
		if (!MigrationClass) throw new Error(`The DataSource has no ${name}`);
		// A copied template database (CI) skips the migration run that wraps the classes,
		// and only a wrapped class accepts a query runner. A second wrap does nothing.
		wrapMigration(MigrationClass);
		return new MigrationClass();
	}

	const tableName = () => `${Container.get(GlobalConfig).database.tablePrefix}linked_instance`;

	it(`${MIGRATION_NAME} ran, and its down and up steps drop and create the table`, async () => {
		const createTable = await loadMigration(MIGRATION_NAME);
		const addColumns = await loadMigration(COLUMNS_MIGRATION_NAME);

		await withQueryRunner(async (queryRunner) => {
			// The later migration goes down first and comes back last, as in a real rollback.
			await addColumns.down(queryRunner);
			await createTable.down(queryRunner);
			try {
				expect(await queryRunner.hasTable(tableName())).toBe(false);
			} finally {
				// Re-create the table also when the check fails, so later tests have it.
				await createTable.up(queryRunner);
				await addColumns.up(queryRunner);
			}
			expect(await queryRunner.hasTable(tableName())).toBe(true);
		});

		// The re-created table keeps the unique rule.
		await createLink(alice.id);
		await expect(repository.createForUser(newLink(alice.id))).resolves.toBeNull();
	});

	it(`${COLUMNS_MIGRATION_NAME} adds the default project columns and keeps the rows and the rules`, async () => {
		const migration = await loadMigration(COLUMNS_MIGRATION_NAME);
		const link = await createLink(alice.id, {
			defaultRemoteProjectId: 'Xk3pQ9aZ1bC2dE4f',
			defaultRemoteProjectName: 'Ops',
		});

		await withQueryRunner(async (queryRunner) => {
			await migration.down(queryRunner);
			try {
				expect(await queryRunner.hasColumn(tableName(), 'defaultRemoteProjectId')).toBe(false);
				expect(await queryRunner.hasColumn(tableName(), 'defaultRemoteProjectName')).toBe(false);
			} finally {
				await migration.up(queryRunner);
			}
		});

		// The row stays, and the new columns start empty.
		await expect(repository.findForUser(alice.id, link.id)).resolves.toMatchObject({
			name: 'Cloud',
			tokenEncrypted: 'ciphertext',
			defaultRemoteProjectId: null,
			defaultRemoteProjectName: null,
		});
		// The copy of the table on SQLite keeps the unique rule and the user foreign key.
		await expect(repository.createForUser(newLink(alice.id))).resolves.toBeNull();
		await expect(repository.createForUser(newLink(randomUUID()))).rejects.toThrow();
		await Container.get(UserRepository).delete({ id: alice.id });
		await expect(repository.listForUser(alice.id)).resolves.toEqual([]);
	});
});
