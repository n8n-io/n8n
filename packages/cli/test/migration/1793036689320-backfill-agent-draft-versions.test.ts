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
	async function prepareBackfill() {
		await context.queryRunner.release();
		await initDbUpToMigration(migrationName);
		context = createTestMigrationContext(Container.get(DataSource));
	}
	async function migrate() {
		await prepareBackfill();
		await context.queryRunner.release();
		try {
			await runSingleMigration(migrationName);
		} finally {
			context = createTestMigrationContext(Container.get(DataSource));
		}
	}
	async function readAgentData() {
		const data: Record<string, Record<string, unknown>[]> = {};
		for (const name of [
			'agents',
			'agent_history',
			'agent_publish_history',
			'agent_task_definition',
			'agent_task_snapshot',
			'skill',
			'skill_version',
			'skill_file',
			'agent_skill_dependency',
			'agent_version_skill_dependency',
		]) {
			data[name] = (await read(name)).sort((a, b) =>
				JSON.stringify(a).localeCompare(JSON.stringify(b)),
			);
		}
		return data;
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
		await prepareBackfill();
		await context.runQuery(
			`UPDATE ${table('agent_history')} SET ${column('name')} = 'Saved name', ${column('description')} = 'Saved description'`,
		);
		await insert('agent_task_snapshot', {
			versionId,
			taskId: 'task_existing',
			enabled: true,
			name: 'Original task',
			objective: 'Keep the saved body',
			cronExpression: '0 9 * * *',
		});
		const before = await readAgentData();
		await migrate();
		expect(await readAgentData()).toEqual(before);
	});

	it('captures all drafts across batch boundaries', async () => {
		for (let index = 0; index < 105; index++) await insertAgent();
		await migrate();
		expect(await read('agent_history')).toHaveLength(105);
		expect(await read('agent_publish_history')).toEqual([]);
	});

	it('skips invalid configuration and integrations without changing those drafts', async () => {
		for (const schema of ['[]', 'false', '42', '"text"']) {
			await insertAgent({ schema, versionId: null });
		}
		for (const integrations of ['{}', 'null', 'false', '42', '"text"']) {
			await insertAgent({ integrations, versionId: null });
		}
		if (context.isSqlite) {
			await insertAgent({ schema: '{', versionId: null });
			await insertAgent({ integrations: '{', versionId: null });
		}
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

	it('preserves all configuration fields when assigning a version to a configured draft', async () => {
		const chat = {
			type: 'n8n_chat',
			enabled: false,
			allowedUsers: ['user_1'],
			nested: { greeting: 'Hello 👋' },
		};
		const schema = {
			name: 'Draft',
			instructions: 'Keep "quotes", \\slashes, and\nnew lines. 日本語',
			model: { id: 'example/model', options: { temperature: 0.4, nested: [null, false, 0, ''] } },
			custom: { value: 'Keep unknown fields', empty: {}, list: [] },
			skills: [{ type: 'skill', id: 'skill_deleted' }],
			integrations: [{ type: 'n8n_chat', enabled: true, stale: true }],
		};
		await insert('settings', { key: 'agents.skillsHubCopy', value: '{}' });
		const agentId = await insertAgent({
			versionId: null,
			schema: JSON.stringify(schema),
			revision: 7,
			tools: JSON.stringify({ tool_1: { nested: [false, null, '雪'], workflowId: 'workflow_1' } }),
			integrations: JSON.stringify([
				null,
				false,
				42,
				'invalid',
				[],
				{},
				{ type: 'slack', credentialId: 'credential_1' },
				chat,
			]),
			updatedAt: '2026-10-01 09:00:00.123',
		});
		const publishedId = randomUUID();
		await insert('agent_history', {
			versionId: publishedId,
			agentId,
			author: 'Original',
			schema: '{}',
		});
		await context.runQuery(
			`UPDATE ${table('agents')} SET ${column('activeVersionId')} = :publishedId WHERE ${column('id')} = :agentId`,
			{ agentId, publishedId },
		);
		await prepareBackfill();
		const before = await readAgentData();

		await migrate();

		const [agent] = await read('agents');
		expect(agent.versionId).toEqual(expect.any(String));
		expect(agent).toEqual({ ...before.agents[0], versionId: agent.versionId });
		const history = await read('agent_history');
		expect(history).toHaveLength(2);
		expect(history).toContainEqual(before.agent_history[0]);
		const draft = history.find((row) => row.versionId === agent.versionId)!;
		const { skills: _skills, integrations: _integrations, ...content } = schema;
		expect(json(draft.schema)).toEqual({ ...content, integrations: [chat] });
		expect(json(draft.tools)).toEqual(json(agent.tools));
		expect(draft.createdAt).toEqual(agent.updatedAt);
		expect(draft.updatedAt).toEqual(agent.updatedAt);
		const after = await readAgentData();
		for (const name of Object.keys(before).filter(
			(name) => name !== 'agents' && name !== 'agent_history',
		)) {
			expect(after[name], name).toEqual(before[name]);
		}
	});

	it('preserves empty configs and leaves instance agents unchanged', async () => {
		const emptyId = await insertAgent({ versionId: null, schema: '{}' });
		const nullId = await insertAgent({ versionId: null, schema: 'null' });
		const instanceId = await insertAgent({ scope: 'instance', projectId: null, versionId: null });
		await prepareBackfill();
		const before = await read('agents');

		await migrate();

		const history = await read('agent_history');
		expect(history).toHaveLength(2);
		expect(json(history.find((row) => row.agentId === emptyId)?.schema)).toEqual({
			integrations: [],
		});
		expect(history.find((row) => row.agentId === nullId)?.schema).toBeNull();
		for (const agent of await read('agents')) {
			const original = before.find((row) => row.id === agent.id)!;
			expect(agent).toEqual({ ...original, versionId: agent.versionId });
			if (agent.id === instanceId) expect(agent.versionId).toBeNull();
			else expect(agent.versionId).toEqual(expect.any(String));
		}
	});

	it('copies task bodies once and keeps other agents tasks separate', async () => {
		const versionId = randomUUID();
		const agentId = await insertAgent({
			versionId,
			schema: JSON.stringify({
				tasks: [
					null,
					false,
					{},
					{ id: 'task_enabled', enabled: true },
					{ id: 'task_enabled', enabled: true },
					{ id: 'task_disabled', enabled: 'true' },
					{ id: 'task_other', enabled: true },
					{ id: 'task_missing', enabled: true },
				],
			}),
		});
		const otherVersionId = randomUUID();
		const otherId = await insertAgent({ versionId: otherVersionId, schema: '{"tasks":{}}' });
		const nullVersionId = randomUUID();
		const nullId = await insertAgent({ versionId: nullVersionId, schema: null });
		for (const [id, owner] of [
			['task_enabled', agentId],
			['task_disabled', agentId],
			['task_other', otherId],
			['task_null', nullId],
		]) {
			await insert('agent_task_definition', {
				id,
				agentId: owner,
				name: id,
				objective: 'Keep the task body',
				cronExpression: '0 9 * * *',
				timezone: null,
			});
		}
		const before = await read('agent_task_definition');

		await migrate();

		expect(await read('agent_task_definition')).toEqual(before);
		const snapshots = await read('agent_task_snapshot');
		expect(snapshots).toHaveLength(4);
		const versions = new Map<unknown, string>([
			[agentId, versionId],
			[otherId, otherVersionId],
			[nullId, nullVersionId],
		]);
		for (const task of before) {
			const snapshot = snapshots.find((row) => row.taskId === task.id)!;
			expect(snapshot).toMatchObject({
				name: task.name,
				objective: task.objective,
				cronExpression: task.cronExpression,
				timezone: null,
			});
			expect(Boolean(snapshot.enabled)).toBe(task.id === 'task_enabled');
			expect(snapshot.versionId).toBe(versions.get(task.agentId));
		}
	});

	it('uses migrated skill IDs when legacy IDs collide between agents', async () => {
		const draftIds = [randomUUID(), randomUUID()];
		const agentIds: string[] = [];
		for (const [index, versionId] of draftIds.entries()) {
			agentIds.push(
				await insertAgent({
					versionId,
					schema: JSON.stringify({ skills: [{ type: 'skill', id: 'skill_shared_legacy_id' }] }),
					skills: JSON.stringify({
						skill_shared_legacy_id: {
							name: 'Example',
							description: 'Example',
							instructions: `Agent ${index}`,
							references: [{ path: 'notes.md', content: `Notes ${index}` }],
						},
					}),
				}),
			);
		}
		await prepareBackfill();
		const before = await readAgentData();

		await migrate();

		const skillIds: string[] = [];
		for (const [index, versionId] of draftIds.entries()) {
			const saved = await pins(versionId);
			expect(saved).toHaveLength(1);
			expect(saved[0].instructions).toBe(`Agent ${index}`);
			const dependency = before.agent_skill_dependency.find(
				(row) => row.agentId === agentIds[index],
			)!;
			expect(saved[0].skillId).toBe(dependency.skillId);
			skillIds.push(saved[0].skillId);
		}
		expect(new Set(skillIds).size).toBe(2);
		const after = await readAgentData();
		for (const name of [
			'agents',
			'skill',
			'skill_version',
			'skill_file',
			'agent_skill_dependency',
			'agent_publish_history',
		]) {
			expect(after[name], name).toEqual(before[name]);
		}
		expect(after.skill_file).toHaveLength(2);
	});

	it('leaves every row unchanged when the migration body runs again', async () => {
		const agentId = await insertAgent({
			versionId: null,
			schema:
				'{"skills":[{"type":"skill","id":"skill_example"}],"tasks":[{"id":"task_example","enabled":true}]}',
			skills:
				'{"skill_example":{"name":"Example","description":"Example","instructions":"Keep this"}}',
		});
		await insert('agent_task_definition', {
			id: 'task_example',
			agentId,
			name: 'Example',
			objective: 'Keep this task',
			cronExpression: '0 9 * * *',
		});
		await migrate();
		const before = await readAgentData();
		const migration = Container.get(DataSource).migrations.find(
			(entry) => entry.constructor.name === migrationName,
		)!;

		// Call the body: the migration runner would skip an already recorded migration.
		await migration.up(context.queryRunner);

		expect(await readAgentData()).toEqual(before);
	});

	it('rolls back all writes if a task snapshot insert fails', async () => {
		for (const [id, taskId] of [
			['agent_a', 'task_success'],
			['agent_z', 'task_failure'],
		]) {
			await insertAgent({
				id,
				versionId: null,
				schema: JSON.stringify({
					tasks: [{ id: taskId, enabled: true }],
					skills: [{ type: 'skill', id: `skill_${id}` }],
				}),
				skills: JSON.stringify({
					[`skill_${id}`]: { name: id, description: 'Example', instructions: 'Keep this skill' },
				}),
			});
			await insert('agent_task_definition', {
				id: taskId,
				agentId: id,
				name: taskId,
				objective: 'Keep this task',
				cronExpression: '0 9 * * *',
			});
		}
		await prepareBackfill();
		const before = await readAgentData();
		const trigger = column('test_fail_task_snapshot');
		if (context.isSqlite) {
			await context.runQuery(`CREATE TRIGGER ${trigger} BEFORE INSERT ON ${table('agent_task_snapshot')}
				WHEN NEW.${column('taskId')} = 'task_failure' BEGIN SELECT RAISE(ABORT, 'Test snapshot failure'); END`);
		} else {
			await context.runQuery(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$
				BEGIN RAISE EXCEPTION 'Test snapshot failure'; END $$`);
			await context.runQuery(`CREATE TRIGGER ${trigger} BEFORE INSERT ON ${table('agent_task_snapshot')}
				FOR EACH ROW WHEN (NEW.${column('taskId')} = 'task_failure') EXECUTE FUNCTION ${trigger}()`);
		}

		await expect(migrate()).rejects.toThrow('Test snapshot failure');

		expect(await readAgentData()).toEqual(before);
		expect(await read('migrations')).not.toContainEqual(
			expect.objectContaining({ name: migrationName }),
		);
		const onTable = context.isPostgres ? ` ON ${table('agent_task_snapshot')}` : '';
		await context.runQuery(`DROP TRIGGER ${trigger}${onTable}`);
		if (context.isPostgres) await context.runQuery(`DROP FUNCTION ${trigger}()`);
		await migrate();
		expect(await read('agent_history')).toHaveLength(2);
		expect(await read('agent_task_snapshot')).toHaveLength(2);
		expect(await read('agent_version_skill_dependency')).toHaveLength(2);
	});

	it('leaves an instance with no agents unchanged', async () => {
		await prepareBackfill();
		const before = await readAgentData();
		await migrate();
		expect(await readAgentData()).toEqual(before);
	});
});
