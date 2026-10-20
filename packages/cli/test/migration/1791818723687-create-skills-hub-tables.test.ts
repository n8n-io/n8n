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

const migrationName = 'CreateSkillsHubTables1791818723687';

type Row = Record<string, string | number | Date | null>;

describe('CreateSkillsHubTables migration', () => {
	let context: TestMigrationContext;

	const insertRow = async (tableName: string, values: Row) => {
		const columns = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(tableName)}
			 (${columns.map((name) => context.escape.columnName(name)).join(', ')})
			 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	};

	const deleteRow = async (tableName: string, column: string, value: string) => {
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName(tableName)} WHERE ${context.escape.columnName(column)} = :value`,
			{ value },
		);
	};

	const countRows = async (tableName: string, column: string, value: string) => {
		const rows = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS ${context.escape.columnName('count')} FROM ${context.escape.tableName(tableName)}
			 WHERE ${context.escape.columnName(column)} = :value`,
			{ value },
		);
		return Number(rows[0].count);
	};

	const insertUser = async () => {
		const id = randomUUID();
		// Roles go in as parameters: the Postgres helper reads `:word` in a literal as one.
		await insertRow('user', {
			id,
			email: `${id}@test.com`,
			firstName: 'Test',
			lastName: 'User',
			password: 'hashed',
			roleSlug: 'global:member',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		return id;
	};

	const insertProject = async () => {
		const id = randomUUID();
		await insertRow('project', { id, name: 'Skills hub project', type: 'team' });
		return id;
	};

	const insertAgent = async (projectId: string) => {
		const id = randomUUID();
		await insertRow('agents', {
			id,
			name: 'Skills hub agent',
			projectId,
			integrations: '[]',
			tools: '{}',
			skills: '{}',
		});
		return id;
	};

	const insertAgentVersion = async (agentId: string) => {
		const versionId = randomUUID();
		await insertRow('agent_history', { versionId, agentId, author: 'Test User' });
		return versionId;
	};

	/** A skill with one version and one file. */
	const insertSkill = async (
		target: { projectId?: string; agentId?: string },
		createdById?: string,
	) => {
		const skillId = `skill_${randomUUID().slice(0, 16)}`;
		await insertRow('skill', {
			id: skillId,
			projectId: target.projectId ?? null,
			agentId: target.agentId ?? null,
			source: 'ui',
			createdById: createdById ?? null,
		});
		const versionId = randomUUID();
		await insertRow('skill_version', {
			id: versionId,
			skillId,
			version: 1,
			name: 'Brand voice',
			description: 'Use when writing emails',
			instructions: 'Write in a warm tone.',
			contentHash: 'a'.repeat(64),
		});
		await insertRow('skill_file', {
			skillVersionId: versionId,
			path: 'references/tone.md',
			content: 'Examples',
		});
		return { skillId, versionId };
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

	beforeEach(() => {
		context = createTestMigrationContext(Container.get(DataSource));
	});

	afterEach(async () => {
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('keeps a project skill when its author is deleted and clears the author', async () => {
		const authorId = await insertUser();
		const projectId = await insertProject();
		const { skillId } = await insertSkill({ projectId }, authorId);

		await deleteRow('user', 'id', authorId);

		const rows = await context.runQuery<Array<{ createdById: string | null }>>(
			`SELECT ${context.escape.columnName('createdById')} FROM ${context.escape.tableName('skill')}
			 WHERE ${context.escape.columnName('id')} = :skillId`,
			{ skillId },
		);
		expect(rows).toEqual([{ createdById: null }]);
	});

	it('deletes a project together with its skills and the agents that pin them', async () => {
		const projectId = await insertProject();
		const agentId = await insertAgent(projectId);
		const agentVersionId = await insertAgentVersion(agentId);
		const agentSkill = await insertSkill({ agentId });
		const { skillId, versionId } = await insertSkill({ projectId });
		await insertRow('agent_skill_dependency', { agentId, skillId, skillVersionId: versionId });
		await insertRow('agent_version_skill_dependency', {
			agentVersionId,
			skillId,
			skillVersionId: versionId,
		});

		await deleteRow('project', 'id', projectId);

		expect(await countRows('agents', 'id', agentId)).toBe(0);
		expect(await countRows('skill', 'id', skillId)).toBe(0);
		expect(await countRows('skill_version', 'skillId', skillId)).toBe(0);
		expect(await countRows('skill_file', 'skillVersionId', versionId)).toBe(0);
		expect(await countRows('agent_skill_dependency', 'skillId', skillId)).toBe(0);
		expect(await countRows('agent_version_skill_dependency', 'skillId', skillId)).toBe(0);
		// An agent skill has no projectId and goes through the agent.
		expect(await countRows('skill', 'id', agentSkill.skillId)).toBe(0);
	});

	/** One agent with a published version, both pinning the same skill version. */
	const insertPinnedSkill = async () => {
		const projectId = await insertProject();
		const agentId = await insertAgent(projectId);
		const agentVersionId = await insertAgentVersion(agentId);
		const { skillId, versionId } = await insertSkill({});
		await insertRow('agent_skill_dependency', { agentId, skillId, skillVersionId: versionId });
		await insertRow('agent_version_skill_dependency', {
			agentVersionId,
			skillId,
			skillVersionId: versionId,
		});
		return { projectId, agentId, agentVersionId, skillId, versionId };
	};

	it('refuses to delete a skill version that agents pin', async () => {
		const { projectId, skillId, versionId } = await insertPinnedSkill();

		await expect(deleteRow('skill_version', 'id', versionId)).rejects.toThrow();
		expect(await countRows('skill_version', 'id', versionId)).toBe(1);

		await deleteRow('project', 'id', projectId);
		await deleteRow('skill', 'id', skillId);
	});

	it('deletes a skill together with the pins on it, and keeps the agents', async () => {
		const { projectId, agentId, agentVersionId, skillId } = await insertPinnedSkill();

		// The service refuses to delete a skill in use. The database only keeps the rows consistent.
		await deleteRow('skill', 'id', skillId);

		expect(await countRows('agent_skill_dependency', 'skillId', skillId)).toBe(0);
		expect(await countRows('agent_version_skill_dependency', 'skillId', skillId)).toBe(0);
		expect(await countRows('agents', 'id', agentId)).toBe(1);
		expect(await countRows('agent_history', 'versionId', agentVersionId)).toBe(1);

		await deleteRow('project', 'id', projectId);
	});

	it('deletes an agent together with its own skills, and keeps project skills', async () => {
		const projectId = await insertProject();
		const agentId = await insertAgent(projectId);
		const agentVersionId = await insertAgentVersion(agentId);
		const own = await insertSkill({ agentId });
		const shared = await insertSkill({ projectId });
		for (const { skillId, versionId } of [own, shared]) {
			await insertRow('agent_skill_dependency', { agentId, skillId, skillVersionId: null });
			await insertRow('agent_version_skill_dependency', {
				agentVersionId,
				skillId,
				skillVersionId: versionId,
			});
		}

		await deleteRow('agents', 'id', agentId);

		expect(await countRows('skill', 'id', own.skillId)).toBe(0);
		expect(await countRows('skill_version', 'skillId', own.skillId)).toBe(0);
		expect(await countRows('skill_file', 'skillVersionId', own.versionId)).toBe(0);
		expect(await countRows('skill', 'id', shared.skillId)).toBe(1);
		expect(await countRows('agent_skill_dependency', 'skillId', shared.skillId)).toBe(0);
		expect(await countRows('agent_version_skill_dependency', 'skillId', shared.skillId)).toBe(0);

		await deleteRow('project', 'id', projectId);
	});

	it('rejects an agent skill that also has a project', async () => {
		const projectId = await insertProject();
		const agentId = await insertAgent(projectId);

		await expect(insertSkill({ projectId, agentId })).rejects.toThrow();

		await deleteRow('project', 'id', projectId);
	});

	// New sources must not need a migration, so the column has no CHECK on its values.
	it('accepts a source value the code does not use yet', async () => {
		const id = `skill_${randomUUID().slice(0, 16)}`;

		await insertRow('skill', { id, source: 'github' });

		expect(await countRows('skill', 'id', id)).toBe(1);
		await deleteRow('skill', 'id', id);
	});
});
