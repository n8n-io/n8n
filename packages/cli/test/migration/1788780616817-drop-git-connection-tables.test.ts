import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'DropGitConnectionTables1788780616817';

const CONNECTION_TABLE = 'git_connection';
const LINK_TABLE = 'git_connection_project';

const PROMOTION_TABLES = [
	'promotion_provider',
	'promotion_connection',
	'promotion_connection_project',
	'promotion_config',
];

describe('DropGitConnectionTables migration', () => {
	let dataSource: DataSource;

	async function insertProject(context: TestMigrationContext, id: string) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')}
			 ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertConnection(context: TestMigrationContext, id: string) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(CONNECTION_TABLE)}
			 ("id", "name", "repositoryUrl", "branchName", "connectionType",
			  "encryptedUsername", "encryptedPassword", "createdAt", "updatedAt")
			 VALUES (:id, :name, :url, :branch, :type, :username, :password, :createdAt, :updatedAt)`,
			{
				id,
				name: 'Production',
				url: 'https://example.com/org/repo.git',
				branch: 'main',
				type: 'https',
				username: 'encrypted',
				password: 'encrypted',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertLink(
		context: TestMigrationContext,
		projectId: string,
		gitConnectionId: string,
	) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(LINK_TABLE)}
			 ("projectId", "gitConnectionId", "createdAt", "updatedAt")
			 VALUES (:projectId, :gitConnectionId, :createdAt, :updatedAt)`,
			{ projectId, gitConnectionId, createdAt: now, updatedAt: now },
		);
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);

		// Populated tables are the interesting case: the link table holds the foreign
		// key, so dropping in the wrong order fails.
		const seed = createTestMigrationContext(dataSource);
		const projectId = randomUUID();
		const connectionId = randomUUID();
		await insertProject(seed, projectId);
		await insertConnection(seed, connectionId);
		await insertLink(seed, projectId, connectionId);
		await seed.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('drops both git-connection tables', async () => {
		const context = createTestMigrationContext(dataSource);

		for (const table of [LINK_TABLE, CONNECTION_TABLE]) {
			expect(await context.queryRunner.hasTable(`${context.tablePrefix}${table}`)).toBe(false);
		}
		await context.queryRunner.release();
	});

	it('keeps the promotions tables that replace them', async () => {
		const context = createTestMigrationContext(dataSource);

		for (const table of PROMOTION_TABLES) {
			expect(await context.queryRunner.hasTable(`${context.tablePrefix}${table}`)).toBe(true);
		}
		await context.queryRunner.release();
	});
});
