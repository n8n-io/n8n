import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection, SourceTypeSchema } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';
import { v7 as uuidv7 } from 'uuid';

const MIGRATION_NAME = 'AddUserAvatar1794991185595';

const sourceTypes = SourceTypeSchema.options;
const previousSourceTypes = sourceTypes.filter((sourceType) => sourceType !== 'user_avatar');

describe('AddUserAvatar Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	const existingUserId = uuidv7();
	const projectId = uuidv7();

	const table = (name: string) => context.escape.tableName(name);
	const column = (name: string) => context.escape.columnName(name);

	async function insertUser(id: string) {
		await context.runQuery(
			`INSERT INTO ${table('user')} (id, ${column('roleSlug')}) VALUES (:id, :roleSlug)`,
			{ id, roleSlug: 'global:member' },
		);
	}

	async function insertBinary(sourceType: string) {
		await context.runQuery(
			`INSERT INTO ${table('binary_data')}
			 (${['fileId', 'sourceType', 'sourceId', 'data', 'fileSize'].map(column).join(', ')})
			 VALUES (:fileId, :sourceType, :sourceId, :data, 1)`,
			{ fileId: uuidv7(), sourceType, sourceId: 'test-source', data: Buffer.from([1]) },
		);
	}

	async function binarySourceTypes() {
		const rows = await context.runQuery<Array<{ sourceType: string }>>(
			`SELECT ${column('sourceType')} FROM ${table('binary_data')} ORDER BY ${column('sourceType')}`,
		);
		return rows.map((row) => row.sourceType);
	}

	async function projectRelationCount(userId: string) {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${table('project_relation')} WHERE ${column('userId')} = :userId`,
			{ userId },
		);
		return Number(count);
	}

	async function avatarOf(userId: string): Promise<unknown> {
		const [row] = await context.runQuery<Array<{ avatar: unknown }>>(
			`SELECT avatar FROM ${table('user')} WHERE id = :userId`,
			{ userId },
		);
		return typeof row.avatar === 'string' ? jsonParse<unknown>(row.avatar) : row.avatar;
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		await insertUser(existingUserId);
		await context.runQuery(
			`INSERT INTO ${table('project')} (id, name, type) VALUES (:id, :name, :type)`,
			{ id: projectId, name: 'Acme', type: 'team' },
		);
		// `project_relation` deletes with its user, so `down` loses it if SQLite rebuilds `user`.
		await context.runQuery(
			`INSERT INTO ${table('project_relation')} (${column('projectId')}, ${column('userId')}, role) VALUES (:projectId, :userId, :role)`,
			{ projectId, userId: existingUserId, role: 'project:editor' },
		);
		for (const sourceType of previousSourceTypes) await insertBinary(sourceType);
		// Release the connection: on SQLite the migration waits for its write lock.
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	beforeEach(() => {
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		if (!context.queryRunner.isReleased) await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('leaves an existing user without a picture, and keeps the rows that reference the user', async () => {
		expect(await avatarOf(existingUserId)).toBeNull();
		expect(await projectRelationCount(existingUserId)).toBe(1);
	});

	it('stores a picture record', async () => {
		const record = { source: 'generated', background: 'gray-dark' };

		await context.runQuery(`UPDATE ${table('user')} SET avatar = :avatar WHERE id = :userId`, {
			avatar: JSON.stringify(record),
			userId: existingUserId,
		});

		expect(await avatarOf(existingUserId)).toEqual(record);
	});

	it('keeps the binaries of every earlier source type', async () => {
		expect(await binarySourceTypes()).toEqual([...previousSourceTypes].sort());
	});

	// One source type per test: on PostgreSQL a rejected insert aborts the transaction.
	it.each(sourceTypes)('accepts a binary of source type %s', async (sourceType) => {
		await expect(insertBinary(sourceType)).resolves.not.toThrow();
	});

	it('rejects a binary of an unknown source type', async () => {
		await expect(insertBinary('unknown_source')).rejects.toThrow();
	});

	it('removes the column and the stored pictures on down, and nothing else', async () => {
		await context.queryRunner.release();
		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);

		await expect(avatarOf(existingUserId)).rejects.toThrow();
		expect(await projectRelationCount(existingUserId)).toBe(1);
		expect(await binarySourceTypes()).not.toContain('user_avatar');
		expect(new Set(await binarySourceTypes())).toEqual(new Set(previousSourceTypes));
	});
});
