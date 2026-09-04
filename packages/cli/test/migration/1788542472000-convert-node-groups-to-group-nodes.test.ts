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
import { GROUP_NODE_TYPE, type IConnections, type INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'ConvertNodeGroupsToGroupNodes1788542472000';

type StoredGroup = { id: string; name: string; nodeIds: string[]; description?: string };

type SeedWorkflow = {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	nodeGroups: StoredGroup[];
};

function node(name: string, x = 0, y = 0): INode {
	return {
		id: name.toLowerCase(),
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [x, y],
		parameters: {},
	};
}

/** Builds main connections from `[from, to]` pairs. */
function connect(...edges: Array<[string, string]>): IConnections {
	const connections: IConnections = {};

	for (const [from, to] of edges) {
		const bySource = (connections[from] ??= {});
		const main = (bySource.main ??= [[]]);
		(main[0] ??= []).push({ node: to, type: 'main', index: 0 });
	}

	return connections;
}

/**
 * Reads a JSON column. SQLite hands back the text; Postgres hands back the
 * parsed value, so the cast in the query keeps both as a string here.
 */
function parseColumn<T>(value: string | T): T {
	return typeof value === 'string' ? (JSON.parse(value) as T) : value;
}

/** Flattens connections to a sorted `'A->B'` list for comparison. */
function edgesOf(connections: IConnections): string[] {
	const edges: string[] = [];

	for (const [from, outputs] of Object.entries(connections)) {
		for (const targets of outputs.main ?? []) {
			for (const target of targets ?? []) {
				edges.push(`${from}->${target.node}`);
			}
		}
	}

	return edges.sort();
}

describe('ConvertNodeGroupsToGroupNodes migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function seed(context: TestMigrationContext, workflow: SeedWorkflow): Promise<void> {
		const table = context.escape.tableName('workflow_entity');
		const historyTable = context.escape.tableName('workflow_history');
		const columns = {
			id: context.escape.columnName('id'),
			workflowId: context.escape.columnName('workflowId'),
			name: context.escape.columnName('name'),
			nodes: context.escape.columnName('nodes'),
			connections: context.escape.columnName('connections'),
			nodeGroups: context.escape.columnName('nodeGroups'),
			active: context.escape.columnName('active'),
			versionId: context.escape.columnName('versionId'),
			authors: context.escape.columnName('authors'),
			createdAt: context.escape.columnName('createdAt'),
			updatedAt: context.escape.columnName('updatedAt'),
		};
		const now = new Date();
		const versionId = randomUUID();
		const payload = {
			nodes: JSON.stringify(workflow.nodes),
			connections: JSON.stringify(workflow.connections),
			nodeGroups: JSON.stringify(workflow.nodeGroups),
		};

		await context.runQuery(
			`INSERT INTO ${table} (${columns.id}, ${columns.name}, ${columns.nodes}, ${columns.connections}, ${columns.nodeGroups}, ${columns.active}, ${columns.versionId}, ${columns.createdAt}, ${columns.updatedAt}) VALUES (:id, :name, :nodes, :connections, :nodeGroups, :active, :versionId, :createdAt, :updatedAt)`,
			{
				id: workflow.id,
				name: workflow.name,
				...payload,
				active: false,
				versionId,
				createdAt: now,
				updatedAt: now,
			},
		);

		// History carries the same columns, so the migration must convert it too.
		await context.runQuery(
			`INSERT INTO ${historyTable} (${columns.versionId}, ${columns.workflowId}, ${columns.nodes}, ${columns.connections}, ${columns.nodeGroups}, ${columns.authors}, ${columns.createdAt}, ${columns.updatedAt}) VALUES (:versionId, :workflowId, :nodes, :connections, :nodeGroups, :authors, :createdAt, :updatedAt)`,
			{
				versionId,
				workflowId: workflow.id,
				...payload,
				authors: 'test-user',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function read(
		context: TestMigrationContext,
		table: 'workflow_entity' | 'workflow_history',
		id: string,
	): Promise<{ nodes: INode[]; connections: IConnections; nodeGroups: StoredGroup[] }> {
		const tableName = context.escape.tableName(table);
		const idColumn = context.escape.columnName(table === 'workflow_entity' ? 'id' : 'workflowId');
		const asText = (column: string) => {
			const escaped = context.escape.columnName(column);
			// Postgres stores these as json; cast so the row reads back as a string.
			return context.isPostgres ? `${escaped}::text AS ${escaped}` : escaped;
		};

		const rows = await context.runQuery<
			Array<{ nodes: string; connections: string; nodeGroups: string }>
		>(
			`SELECT ${asText('nodes')}, ${asText('connections')}, ${asText('nodeGroups')} FROM ${tableName} WHERE ${idColumn} = :id`,
			{ id },
		);
		const row = rows[0];

		return {
			nodes: parseColumn<INode[]>(row.nodes),
			connections: parseColumn<IConnections>(row.connections),
			nodeGroups: parseColumn<StoredGroup[]>(row.nodeGroups),
		};
	}

	describe('up', () => {
		const ids = {
			chain: randomUUID(),
			ungrouped: randomUUID(),
			twoGroups: randomUUID(),
			missingMember: randomUUID(),
		};

		beforeAll(async () => {
			const context = createTestMigrationContext(dataSource);

			// A group of two nodes with an edge in and an edge out.
			await seed(context, {
				id: ids.chain,
				name: 'Chain',
				nodes: [node('Src'), node('A', 400), node('B', 600), node('Dst', 800)],
				connections: connect(['Src', 'A'], ['A', 'B'], ['B', 'Dst']),
				nodeGroups: [
					{ id: 'g1', name: 'End', nodeIds: ['a', 'b'], description: 'extract and load' },
				],
			});

			// No group at all: the migration must not touch it.
			await seed(context, {
				id: ids.ungrouped,
				name: 'Ungrouped',
				nodes: [node('Src'), node('Dst', 400)],
				connections: connect(['Src', 'Dst']),
				nodeGroups: [],
			});

			// Two groups next to each other.
			await seed(context, {
				id: ids.twoGroups,
				name: 'Two groups',
				nodes: [node('A'), node('B', 400)],
				connections: connect(['A', 'B']),
				nodeGroups: [
					{ id: 'g1', name: 'First', nodeIds: ['a'] },
					{ id: 'g2', name: 'Second', nodeIds: ['b'] },
				],
			});

			// A group naming a node the workflow does not hold.
			await seed(context, {
				id: ids.missingMember,
				name: 'Missing member',
				nodes: [node('Kept')],
				connections: {},
				nodeGroups: [{ id: 'g1', name: 'Ghost', nodeIds: ['gone'] }],
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
		});

		it('writes a group node carrying the title and the objective', async () => {
			const context = createTestMigrationContext(dataSource);
			const { nodes } = await read(context, 'workflow_entity', ids.chain);
			await context.queryRunner.release();

			expect(nodes.find((candidate) => candidate.type === GROUP_NODE_TYPE)).toMatchObject({
				id: 'g1',
				name: 'End',
				type: GROUP_NODE_TYPE,
				parameters: { objective: 'extract and load' },
			});
		});

		it('sets parentId on the members and leaves other nodes alone', async () => {
			const context = createTestMigrationContext(dataSource);
			const { nodes } = await read(context, 'workflow_entity', ids.chain);
			await context.queryRunner.release();

			const byName = new Map(nodes.map((candidate) => [candidate.name, candidate]));

			expect(byName.get('A')?.parentId).toBe('g1');
			expect(byName.get('B')?.parentId).toBe('g1');
			expect(byName.get('Src')?.parentId).toBeUndefined();
			expect(byName.get('Dst')?.parentId).toBeUndefined();
		});

		it("re-points the boundary edges onto the group's ports", async () => {
			const context = createTestMigrationContext(dataSource);
			const { connections } = await read(context, 'workflow_entity', ids.chain);
			await context.queryRunner.release();

			// `Src -> A` becomes `Src -> End`; `B -> Dst` becomes `End -> Dst`;
			// `A -> B` is inside the group, so it stays.
			expect(edgesOf(connections)).toEqual(['A->B', 'End->Dst', 'Src->End']);
		});

		it('keeps nodeGroups, so an instance with the feature off still reads it', async () => {
			const context = createTestMigrationContext(dataSource);
			const { nodeGroups } = await read(context, 'workflow_entity', ids.chain);
			await context.queryRunner.release();

			expect(nodeGroups).toEqual([
				{ id: 'g1', name: 'End', nodeIds: ['a', 'b'], description: 'extract and load' },
			]);
		});

		it('converts the workflow history too', async () => {
			const context = createTestMigrationContext(dataSource);
			const { nodes, connections } = await read(context, 'workflow_history', ids.chain);
			await context.queryRunner.release();

			expect(nodes.some((candidate) => candidate.type === GROUP_NODE_TYPE)).toBe(true);
			expect(edgesOf(connections)).toEqual(['A->B', 'End->Dst', 'Src->End']);
		});

		it('leaves a workflow with no group untouched', async () => {
			const context = createTestMigrationContext(dataSource);
			const { nodes, connections } = await read(context, 'workflow_entity', ids.ungrouped);
			await context.queryRunner.release();

			expect(nodes.some((candidate) => candidate.type === GROUP_NODE_TYPE)).toBe(false);
			expect(nodes.every((candidate) => candidate.parentId === undefined)).toBe(true);
			expect(edgesOf(connections)).toEqual(['Src->Dst']);
		});

		it('connects two groups through their own ports', async () => {
			const context = createTestMigrationContext(dataSource);
			const { connections } = await read(context, 'workflow_entity', ids.twoGroups);
			await context.queryRunner.release();

			expect(edgesOf(connections)).toEqual(['First->Second']);
		});

		it('never drops a group, even when its members are gone', async () => {
			const context = createTestMigrationContext(dataSource);
			const { nodes } = await read(context, 'workflow_entity', ids.missingMember);
			await context.queryRunner.release();

			// The group survives as an empty group; losing it would lose the user's work.
			expect(nodes.find((candidate) => candidate.id === 'g1')).toMatchObject({
				name: 'Ghost',
				type: GROUP_NODE_TYPE,
			});
			expect(nodes.some((candidate) => candidate.name === 'Kept')).toBe(true);
		});
	});

	describe('round trip', () => {
		const id = randomUUID();
		const original = {
			nodes: [node('Src'), node('A', 400), node('B', 600), node('Dst', 800)],
			connections: connect(['Src', 'A'], ['A', 'B'], ['B', 'Dst']),
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'], description: 'does a thing' }],
		};

		beforeAll(async () => {
			const context = createTestMigrationContext(dataSource);
			await seed(context, { id, name: 'Round trip', ...original });
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			// Down converts the group nodes back into `nodeGroups`.
			await undoLastSingleMigration();
		});

		it('restores the original nodes, connections, and groups', async () => {
			const context = createTestMigrationContext(dataSource);
			const restored = await read(context, 'workflow_entity', id);
			await context.queryRunner.release();

			expect(restored.nodes.map((candidate) => candidate.name).sort()).toEqual([
				'A',
				'B',
				'Dst',
				'Src',
			]);
			expect(restored.nodes.every((candidate) => candidate.parentId === undefined)).toBe(true);
			expect(edgesOf(restored.connections)).toEqual(edgesOf(original.connections));
			expect(restored.nodeGroups).toEqual(original.nodeGroups);
		});
	});
});
