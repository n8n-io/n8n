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

const migrationName = 'CreateAgentPlanTables1790243938988';

describe('CreateAgentPlanTables migration', () => {
	let context: TestMigrationContext;
	let projectId: string;
	let threadId: string;

	const insertRow = async (tableName: string, values: Record<string, string | number | null>) => {
		const columns = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(tableName)}
			 (${columns.map((name) => context.escape.columnName(name)).join(', ')})
			 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	};

	const insertPlan = async (overrides: Record<string, string | number | null> = {}) => {
		const id = randomUUID();
		await insertRow('agent_plan', { id, threadId, formatVersion: 1, data: '{}', ...overrides });
		return id;
	};

	const insertSnapshot = async (
		planId: string,
		overrides: Record<string, string | number | null> = {},
	) => {
		await insertRow('agent_plan_history', {
			planId,
			revision: 1,
			formatVersion: 1,
			data: '{}',
			...overrides,
		});
	};

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		const initial = createTestMigrationContext(Container.get(DataSource));
		try {
			await initial.queryRunner.clearDatabase();
		} finally {
			await initial.queryRunner.release();
		}
		await initDbUpToMigration(migrationName);
		await runSingleMigration(migrationName);
	});

	beforeEach(async () => {
		context = createTestMigrationContext(Container.get(DataSource));
		projectId = randomUUID();
		const agentId = randomUUID();
		threadId = `test-${agentId}:${randomUUID()}`;
		await insertRow('project', { id: projectId, name: 'Plan storage project', type: 'team' });
		await insertRow('agents', {
			id: agentId,
			name: 'Plan storage agent',
			projectId,
			integrations: '[]',
			tools: '{}',
			skills: '{}',
		});
		await insertRow('agent_execution_threads', {
			id: threadId,
			agentId,
			agentName: 'Plan storage agent',
			projectId,
		});
	});

	afterEach(async () => {
		try {
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('project')} WHERE ${context.escape.columnName('id')} = :projectId`,
				{ projectId },
			);
		} finally {
			await context.queryRunner.release();
		}
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('creates the columns, keys, and active-plan index', async () => {
		const plan = await context.queryRunner.getTable(`${context.tablePrefix}agent_plan`);
		const history = await context.queryRunner.getTable(`${context.tablePrefix}agent_plan_history`);
		expect(plan?.columns.find((column) => column.name === 'id')).toMatchObject({
			type: context.isPostgres ? 'uuid' : 'varchar',
			isPrimary: true,
		});
		expect(plan?.columns.find((column) => column.name === 'data')).toMatchObject({
			type: context.isPostgres ? 'json' : 'text',
			isNullable: false,
		});
		expect(plan?.columns.find((column) => column.name === 'threadId')).toMatchObject({
			length: '128',
			isNullable: false,
		});
		expect(plan?.columns.find((column) => column.name === 'closedAt')?.isNullable).toBe(true);
		expect(plan?.foreignKeys).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ columnNames: ['threadId'], onDelete: 'CASCADE' }),
			]),
		);
		expect(plan?.indices).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ columnNames: ['threadId'], isUnique: false }),
				expect.objectContaining({
					columnNames: ['threadId'],
					isUnique: true,
					where: expect.stringContaining('closedAt'),
				}),
			]),
		);
		expect(history?.primaryColumns.map((column) => column.name)).toEqual(['planId', 'revision']);
		expect(history?.foreignKeys).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ columnNames: ['planId'], onDelete: 'CASCADE' }),
			]),
		);
	});

	it('permits several closed plans but only one active plan per thread', async () => {
		await insertPlan({ closedAt: '2026-09-24T09:00:00.000Z' });
		await insertPlan({ closedAt: '2026-09-24T10:00:00.000Z' });
		const active = await insertPlan();
		await expect(insertPlan()).rejects.toThrow();
		const rows = await context.runQuery<Array<{ revision: number }>>(
			`SELECT ${context.escape.columnName('revision')} FROM ${context.escape.tableName('agent_plan')}
			 WHERE ${context.escape.columnName('id')} = :id`,
			{ id: active },
		);
		expect(rows).toEqual([{ revision: 1 }]);
	});

	it.each([
		['agent_plan', 'revision'],
		['agent_plan', 'formatVersion'],
		['agent_plan_history', 'revision'],
		['agent_plan_history', 'formatVersion'],
	])('requires positive %s.%s values', async (tableName, field) => {
		const id = tableName === 'agent_plan_history' ? await insertPlan() : randomUUID();
		for (const value of [0, -1]) {
			await expect(
				tableName === 'agent_plan'
					? insertPlan({ [field]: value })
					: insertSnapshot(id, { [field]: value }),
			).rejects.toThrow();
		}
	});

	it('requires plan documents and format versions', async () => {
		await expect(insertPlan({ data: null })).rejects.toThrow();
		await expect(insertPlan({ formatVersion: null })).rejects.toThrow();
		const id = await insertPlan();
		await expect(insertSnapshot(id, { data: null })).rejects.toThrow();
		await expect(insertSnapshot(id, { formatVersion: null })).rejects.toThrow();
	});

	it('enforces plan and snapshot references and snapshot uniqueness', async () => {
		await expect(insertPlan({ threadId: randomUUID() })).rejects.toThrow();
		await expect(insertSnapshot(randomUUID())).rejects.toThrow();
		const id = await insertPlan();
		await insertSnapshot(id);
		await expect(insertSnapshot(id)).rejects.toThrow();
		await insertSnapshot(id, { revision: 2 });
	});

	it('cascades thread deletion to plans and snapshots', async () => {
		const id = await insertPlan();
		await insertSnapshot(id);
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('agent_execution_threads')} WHERE ${context.escape.columnName('id')} = :threadId`,
			{ threadId },
		);
		for (const tableName of ['agent_plan', 'agent_plan_history']) {
			expect(
				await context.runQuery(`SELECT * FROM ${context.escape.tableName(tableName)}`),
			).toEqual([]);
		}
	});

	it('reverts populated tables and reapplies without changing the parent session', async () => {
		await insertSnapshot(await insertPlan());
		await context.queryRunner.release();
		await undoLastSingleMigration();
		context = createTestMigrationContext(Container.get(DataSource));
		expect(await context.queryRunner.hasTable(`${context.tablePrefix}agent_plan`)).toBe(false);
		expect(await context.queryRunner.hasTable(`${context.tablePrefix}agent_plan_history`)).toBe(
			false,
		);
		const sessions = await context.runQuery<Array<{ id: string }>>(
			`SELECT ${context.escape.columnName('id')} FROM ${context.escape.tableName('agent_execution_threads')}
			 WHERE ${context.escape.columnName('id')} = :threadId`,
			{ threadId },
		);
		expect(sessions).toEqual([{ id: threadId }]);
		await context.queryRunner.release();
		await runSingleMigration(migrationName);
		context = createTestMigrationContext(Container.get(DataSource));
		await insertSnapshot(await insertPlan());
		await expect(insertPlan()).rejects.toThrow();
	});
});
