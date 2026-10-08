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

const migration = 'NormalizeAgentCustomToolIds1791455618098';
const agentId = 'Agent00000000001';
const projectId = 'Project000000001';
const skillId = 'skill_1111111111111111';
const taskId = 'task_2222222222222222';
const now = new Date('2026-01-01T00:00:00.000Z');
const skill = {
	name: 'Triage',
	description: 'Triage requests',
	instructions: 'Use lookup_customer.',
};
const tool = {
	code: 'export default new Tool("lookup_customer")',
	descriptor: { name: 'lookup_customer' },
};
const schema = {
	name: 'Agent',
	instructions: `Keep this text: ${skillId} ${taskId} lookup_customer.`,
	tools: [{ type: 'custom', id: 'lookup_customer', enabled: false }],
	skills: [{ type: 'skill', id: skillId }],
	tasks: [{ type: 'task', id: taskId, enabled: true }],
};

type AgentConfig = typeof schema;
type AgentRow = {
	schema: AgentConfig;
	tools: Record<string, typeof tool>;
	skills: Record<string, typeof skill>;
};

function parse<T>(value: unknown): T {
	return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

describe('NormalizeAgentCustomToolIds migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(run: (ctx: TestMigrationContext) => Promise<T>): Promise<T> {
		const ctx = createTestMigrationContext(dataSource);
		try {
			return await run(ctx);
		} finally {
			await ctx.queryRunner.release();
		}
	}

	async function insert(table: string, values: Record<string, unknown>) {
		const columns = Object.keys(values);
		await withContext(
			async (ctx) =>
				await ctx.runQuery(
					`INSERT INTO ${ctx.escape.tableName(table)} (${columns.map(ctx.escape.columnName).join(', ')})
			 VALUES (${columns.map((column) => `:${column}`).join(', ')})`,
					values,
				),
		);
	}

	async function rows(table: string) {
		return await withContext(
			async (ctx) =>
				await ctx.runQuery<Array<Record<string, unknown>>>(
					`SELECT * FROM ${ctx.escape.tableName(table)}`,
				),
		);
	}

	async function insertAgent(id = agentId, values: Record<string, unknown> = {}) {
		await insert('agents', {
			id,
			projectId,
			name: 'Agent',
			integrations: '[]',
			schema: JSON.stringify(schema),
			tools: JSON.stringify({ lookup_customer: tool }),
			skills: JSON.stringify({ [skillId]: skill }),
			createdAt: now,
			updatedAt: now,
			...values,
		});
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (ctx) => await ctx.queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
		await insert('project', {
			id: projectId,
			name: 'Project',
			type: 'team',
			createdAt: now,
			updatedAt: now,
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('gives each tool one ID across drafts and published history batches', async () => {
		const versionIds = Array.from({ length: 101 }, () => randomUUID());
		await insertAgent();
		for (const versionId of versionIds) {
			await insert('agent_history', {
				versionId,
				agentId,
				author: 'Test',
				schema: JSON.stringify(schema),
				tools: JSON.stringify({ lookup_customer: tool }),
				skills: JSON.stringify({ [skillId]: skill }),
				createdAt: now,
				updatedAt: now,
			});
		}
		await withContext(
			async (ctx) =>
				await ctx.runQuery(
					`UPDATE ${ctx.escape.tableName('agents')} SET ${ctx.escape.columnName('activeVersionId')} = :versionId`,
					{ versionId: versionIds[0] },
				),
		);

		await runSingleMigration(migration);

		const [agent] = await rows('agents');
		const tools = parse<AgentRow['tools']>(agent.tools);
		const [toolId] = Object.keys(tools);
		expect(toolId).toMatch(/^[A-Za-z0-9]{16}$/);
		expect(tools).toEqual({ [toolId]: tool });
		const expectedSchema = {
			...schema,
			tools: [{ ...schema.tools[0], id: toolId }],
		};
		expect(parse(agent.schema)).toEqual(expectedSchema);
		expect(parse(agent.skills)).toEqual({ [skillId]: skill });
		expect(agent.activeVersionId).toBe(versionIds[0]);
		const history = await rows('agent_history');
		expect(history).toHaveLength(101);
		for (const version of history) {
			expect(parse(version.schema)).toEqual(expectedSchema);
			expect(parse(version.tools)).toEqual(tools);
			expect(parse(version.skills)).toEqual({ [skillId]: skill });
		}
	});

	it('preserves opaque IDs and separates tool names across agents', async () => {
		const opaqueToolId = '4444444444444444';
		const namedToolId = 'abcdefghijklmnop';
		const collisionSchema = {
			...schema,
			tools: [
				...schema.tools,
				{ type: 'custom', id: opaqueToolId },
				{ type: 'custom', id: namedToolId },
			],
		};
		const existingTool = { ...tool, descriptor: { name: 'existing_tool' } };
		const namedTool = { ...tool, descriptor: { name: namedToolId } };
		await insertAgent(agentId, {
			schema: JSON.stringify(collisionSchema),
			tools: JSON.stringify({
				lookup_customer: tool,
				[opaqueToolId]: existingTool,
				[namedToolId]: namedTool,
			}),
		});
		await insertAgent('Agent00000000002', {
			skills: '{}',
			schema: JSON.stringify({ tools: schema.tools }),
		});

		await runSingleMigration(migration);

		const agents = await rows('agents');
		const agent = agents.find((row) => row.id === agentId)!;
		const config = parse<AgentConfig>(agent.schema);
		const tools = parse<AgentRow['tools']>(agent.tools);
		expect(tools[opaqueToolId]).toEqual(existingTool);
		expect(tools[config.tools[2].id]).toEqual(namedTool);
		expect(config.tools[2].id).not.toBe(namedToolId);
		const otherAgent = agents.find((row) => row.id !== agentId)!;
		expect(Object.keys(parse<AgentRow['tools']>(otherAgent.tools))[0]).not.toBe(config.tools[0].id);
	});
});
