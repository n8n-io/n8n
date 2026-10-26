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

const migrationName = 'BackfillAgentDraftVersions1793036689320';
type Row = Record<string, string | number | boolean | null>;

describe('Backfill agent draft versions', () => {
	let context: TestMigrationContext;
	const projectId = randomUUID();

	beforeAll(async () => await Container.get(DbConnection).init());
	beforeEach(async () => {
		context = createTestMigrationContext(Container.get(DataSource));
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration('MigrateAgentSkillsToHub1792764566513');
		context = createTestMigrationContext(Container.get(DataSource));
		await insert('project', { id: projectId, name: 'Example', type: 'team' });
	});
	afterEach(async () => await context.queryRunner.release());
	afterAll(async () => await Container.get(DbConnection).close());

	const table = (name: string) => context.escape.tableName(name);
	const column = (name: string) => context.escape.columnName(name);

	async function insert(name: string, row: Row) {
		const keys = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${table(name)} (${keys.map(column).join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`,
			row,
		);
	}
	async function read<T = Record<string, unknown>>(name: string) {
		return await context.runQuery<T[]>(`SELECT * FROM ${table(name)}`);
	}
	async function insertAgent(values: Row = {}) {
		const id = randomUUID();
		await insert('agents', {
			id,
			projectId,
			name: 'Example',
			versionId: randomUUID(),
			schema: '{"name":"Draft"}',
			integrations: '[]',
			tools: '{}',
			skills: '{}',
			...values,
		});
		return id;
	}
	async function migrate() {
		await context.queryRunner.release();
		await initDbUpToMigration(migrationName);
		await runSingleMigration(migrationName);
		context = createTestMigrationContext(Container.get(DataSource));
	}
	function json(value: unknown): unknown {
		return typeof value === 'string' ? JSON.parse(value) : value;
	}
	async function pins(versionId: string) {
		return await context.runQuery<{ skillId: string; instructions: string }[]>(
			`SELECT pin.${column('skillId')}, version.${column('instructions')}
			 FROM ${table('agent_version_skill_dependency')} pin
			 JOIN ${table('skill_version')} version ON version.${column('id')} = pin.${column('skillVersionId')}
			 WHERE pin.${column('agentVersionId')} = :versionId ORDER BY pin.${column('createdAt')}`,
			{ versionId },
		);
	}

	it('captures the draft after skills and publications without changing the active version', async () => {
		const draftId = randomUUID();
		const publishedId = randomUUID();
		const skill = {
			name: 'Example',
			description: 'An example',
			instructions: 'Draft instructions',
		};
		const schema = {
			name: 'Draft',
			instructions: 'Draft prompt',
			skills: [{ type: 'skill', id: 'skill_example' }],
			tasks: [
				{ id: 'task_enabled', enabled: true },
				{ id: 'task_disabled', enabled: false },
			],
		};
		const agentId = await insertAgent({
			versionId: draftId,
			schema: JSON.stringify(schema),
			skills: JSON.stringify({ skill_example: skill }),
			tools: '{"tool_example":{"name":"Example tool"}}',
			integrations: '[{"type":"n8n_chat"},{"type":"slack"}]',
			revision: 4,
			updatedAt: '2026-10-01 09:00:00.000',
		});
		await insert('agent_history', {
			versionId: publishedId,
			agentId,
			schema: JSON.stringify({ ...schema, name: 'Published' }),
			skills: JSON.stringify({
				skill_example: { ...skill, instructions: 'Published instructions' },
			}),
			author: 'Original publisher',
		});
		await context.runQuery(
			`UPDATE ${table('agents')} SET ${column('activeVersionId')} = :publishedId WHERE ${column('id')} = :agentId`,
			{ agentId, publishedId },
		);
		for (const taskId of ['task_enabled', 'task_disabled', 'task_unreferenced']) {
			await insert('agent_task_definition', {
				id: taskId,
				agentId,
				name: taskId,
				objective: 'Check the inbox',
				cronExpression: '0 9 * * *',
				timezone: 'Europe/Berlin',
			});
		}
		const [originalAgent] = await read('agents');
		const [originalHistory] = await read('agent_history');

		await migrate();

		expect(await read('agents')).toEqual([{ ...originalAgent, publicationRevision: 0 }]);
		const history = await read('agent_history');
		expect(history).toHaveLength(2);
		expect(history.find((version) => version.versionId === publishedId)).toEqual({
			...originalHistory,
			name: null,
			description: null,
		});
		const draft = history.find((version) => version.versionId === draftId)!;
		expect(draft).toMatchObject({
			agentId,
			author: 'Unknown',
			publishedById: null,
			name: null,
			description: null,
			createdAt: originalAgent.updatedAt,
			updatedAt: originalAgent.updatedAt,
		});
		expect(json(draft.schema)).toEqual({
			name: schema.name,
			instructions: schema.instructions,
			tasks: schema.tasks,
			integrations: [{ type: 'n8n_chat' }],
		});
		expect(json(draft.tools)).toEqual(json(originalAgent.tools));
		expect(draft.skills).toBeNull();
		expect(await pins(draftId)).toEqual([
			{ skillId: 'skill_example', instructions: skill.instructions },
		]);
		expect(await pins(publishedId)).toEqual([
			{ skillId: 'skill_example', instructions: 'Published instructions' },
		]);
		const tasks = await read('agent_task_snapshot');
		expect(tasks).toHaveLength(3);
		for (const task of tasks) {
			expect(task).toMatchObject({
				versionId: draftId,
				name: task.taskId,
				objective: 'Check the inbox',
				cronExpression: '0 9 * * *',
				timezone: 'Europe/Berlin',
			});
			expect(Boolean(task.enabled)).toBe(task.taskId === 'task_enabled');
		}
		expect(await read('agent_publish_history')).toEqual([
			expect.objectContaining({ versionId: publishedId, author: 'Original publisher' }),
		]);
	});

	it('preserves explicit pins and resolves unpinned or mismatched pins to the latest version', async () => {
		await insert('settings', { key: 'agents.skillsHubCopy', value: '{}' });
		const versionId = randomUUID();
		const agentId = await insertAgent({ versionId });
		const versions: string[][] = [];
		for (const skillId of ['skill_c', 'skill_b', 'skill_a']) {
			await insert('skill', { id: skillId, projectId, source: 'ui' });
			const ids = [randomUUID(), randomUUID()];
			versions.push(ids);
			for (const [index, id] of ids.entries()) {
				await insert('skill_version', {
					id,
					skillId,
					version: index + 1,
					name: skillId,
					description: 'Example',
					instructions: `${skillId} version ${index + 1}`,
					contentHash: 'a'.repeat(64),
				});
			}
		}
		for (const [index, skillId] of ['skill_c', 'skill_b', 'skill_a'].entries()) {
			await insert('agent_skill_dependency', {
				agentId,
				skillId,
				skillVersionId: index === 1 ? null : versions[0][0],
				createdAt: `2026-10-01 09:0${index}:00.000`,
			});
		}
		const dependencies = await read('agent_skill_dependency');

		await migrate();

		expect(await pins(versionId)).toEqual([
			{ skillId: 'skill_c', instructions: 'skill_c version 1' },
			{ skillId: 'skill_b', instructions: 'skill_b version 2' },
			{ skillId: 'skill_a', instructions: 'skill_a version 2' },
		]);
		const snapshots = await read('agent_version_skill_dependency');
		for (const dependency of dependencies) {
			expect(snapshots).toContainEqual(
				expect.objectContaining({
					skillId: dependency.skillId,
					createdAt: dependency.createdAt,
				}),
			);
		}
		expect(await read('agent_publish_history')).toEqual([]);
	});

	it('assigns a version to an empty project draft and excludes instance agents', async () => {
		const agentId = await insertAgent({ versionId: null, schema: null });
		await insertAgent({ scope: 'instance', projectId: null, versionId: null });
		await migrate();
		const history = await read('agent_history');
		expect(history).toEqual([expect.objectContaining({ agentId, schema: null })]);
		expect((await read('agents')).find((agent) => agent.id === agentId)?.versionId).toBe(
			history[0].versionId,
		);
		expect(history[0].versionId).toEqual(expect.any(String));
		expect(await read('agent_publish_history')).toEqual([]);
	});

	it('leaves a current version that is already in history unchanged', async () => {
		const versionId = randomUUID();
		const agentId = await insertAgent({ versionId });
		await insert('agent_history', {
			versionId,
			agentId,
			schema: '{"name":"Existing"}',
			author: 'Original',
		});
		const [original] = await read('agent_history');
		await migrate();
		expect(await read('agent_history')).toEqual([{ ...original, name: null, description: null }]);
	});

	it('captures all drafts across batch boundaries', async () => {
		for (let index = 0; index < 105; index++) await insertAgent();
		await migrate();
		expect(await read('agent_history')).toHaveLength(105);
		expect(await read('agent_publish_history')).toEqual([]);
	});

	it('skips invalid configuration and integrations without changing those drafts', async () => {
		await insertAgent({ schema: '[]', versionId: null });
		await insertAgent({ integrations: '{}', versionId: null });
		if (context.isSqlite) await insertAgent({ schema: '{', versionId: null });
		const skipped = await read('agents');
		const agentId = await insertAgent();
		await migrate();
		expect(await read('agent_history')).toEqual([expect.objectContaining({ agentId })]);
		for (const agent of skipped) {
			expect(await read('agents')).toContainEqual({ ...agent, publicationRevision: 0 });
		}
	});

	it('skips a draft with a skill that has no saved version', async () => {
		await insert('settings', { key: 'agents.skillsHubCopy', value: '{}' });
		const agentId = await insertAgent({ versionId: null });
		await insert('skill', { id: 'skill_empty', projectId, source: 'ui' });
		await insert('agent_skill_dependency', { agentId, skillId: 'skill_empty' });
		const [original] = await read('agents');
		await migrate();
		expect(await read('agent_history')).toEqual([]);
		expect(await read('agent_version_skill_dependency')).toEqual([]);
		expect(await read('agents')).toEqual([{ ...original, publicationRevision: 0 }]);
	});
});
