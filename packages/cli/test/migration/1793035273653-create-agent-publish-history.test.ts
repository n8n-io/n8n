import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const metadataMigration = 'AddAgentVersionMetadata1793035272968';
const publicationMigration = 'CreateAgentPublishHistory1793035273653';

describe('Agent version storage', () => {
	let context: TestMigrationContext;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const draftId = randomUUID();
	const publishedId = randomUUID();

	beforeAll(async () => {
		await Container.get(DbConnection).init();
	});
	beforeEach(async () => {
		context = createTestMigrationContext(Container.get(DataSource));
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(metadataMigration);
		context = createTestMigrationContext(Container.get(DataSource));
		await insert('project', { id: projectId, name: 'Example', type: 'team' });
		await insert('agents', {
			id: agentId,
			projectId,
			name: 'Example',
			versionId: draftId,
			integrations: '[]',
			tools: '{}',
			skills: '{}',
		});
		await insert('agent_history', {
			versionId: publishedId,
			agentId,
			author: 'Original publisher',
			schema: '{"name":"Published"}',
			tools: '{}',
			skills: '{}',
		});
		await context.runQuery(
			`UPDATE ${context.escape.tableName('agents')} SET ${context.escape.columnName('activeVersionId')} = :version WHERE ${context.escape.columnName('id')} = :id`,
			{ version: publishedId, id: agentId },
		);
	});
	afterEach(async () => await context.queryRunner.release());
	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insert(table: string, row: Record<string, string | null>) {
		const keys = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${keys.map(context.escape.columnName).join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`,
			row,
		);
	}
	async function read(table: string) {
		return await context.runQuery<Record<string, unknown>[]>(
			`SELECT * FROM ${context.escape.tableName(table)}`,
		);
	}
	async function migrate() {
		await context.queryRunner.release();
		await runSingleMigration(metadataMigration);
		await runSingleMigration(publicationMigration);
		context = createTestMigrationContext(Container.get(DataSource));
	}

	it('preserves the draft and published snapshot and marks imported events as incomplete', async () => {
		await migrate();
		expect(await read('agents')).toEqual([
			expect.objectContaining({
				versionId: draftId,
				activeVersionId: publishedId,
				publicationRevision: 0,
			}),
		]);
		expect(await read('agent_history')).toEqual([
			expect.objectContaining({
				versionId: publishedId,
				name: null,
				description: null,
				author: 'Original publisher',
			}),
		]);
		const [event] = await read('agent_publish_history');
		expect(event).toMatchObject({
			agentId,
			versionId: publishedId,
			event: 'activated',
			userId: null,
			author: 'Original publisher',
		});
		expect(Boolean(event.isLegacy)).toBe(true);
	});

	it('does not count a never-published draft as a publication', async () => {
		await insert('agents', {
			id: randomUUID(),
			projectId,
			name: 'Draft only',
			versionId: randomUUID(),
			integrations: '[]',
			tools: '{}',
			skills: '{}',
		});
		await migrate();
		expect(await read('agent_publish_history')).toHaveLength(1);
	});

	it('retains publisher attribution after the user is deleted', async () => {
		const userId = randomUUID();
		await insert('user', {
			id: userId,
			email: 'publisher@example.test',
			roleSlug: 'global:member',
		});
		await context.runQuery(
			`UPDATE ${context.escape.tableName('agent_history')} SET ${context.escape.columnName('publishedById')} = :userId`,
			{ userId },
		);
		await migrate();
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('user')} WHERE ${context.escape.columnName('id')} = :userId`,
			{ userId },
		);
		expect(await read('agent_publish_history')).toEqual([
			expect.objectContaining({ userId: null, author: 'Original publisher' }),
		]);
	});

	it('preserves incoming foreign keys through upgrade and revert', async () => {
		await insert('agent_task_snapshot', {
			versionId: publishedId,
			taskId: 'task_12345678',
			enabled: '1',
			name: 'Example task',
			objective: 'Read the inbox',
			cronExpression: '0 9 * * *',
		});
		await migrate();
		expect(await read('agent_task_snapshot')).toHaveLength(1);
		await context.queryRunner.release();
		await undoLastSingleMigration();
		await undoLastSingleMigration();
		context = createTestMigrationContext(Container.get(DataSource));
		expect(await read('agent_task_snapshot')).toHaveLength(1);
		expect(await read('agent_history')).toHaveLength(1);
		expect(await read('agents')).toEqual([
			expect.objectContaining({ activeVersionId: publishedId }),
		]);
		await migrate();
		expect(await read('agent_publish_history')).toHaveLength(1);
	});
});
