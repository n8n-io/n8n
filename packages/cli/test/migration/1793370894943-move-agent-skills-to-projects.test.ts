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

import { skillContentHash } from '@/modules/skills/testing';

const migrationName = 'MoveAgentSkillsToProjects1793370894943';

type Row = Record<string, string | number | boolean | null>;
type SkillRow = { id: string; projectId: string | null };
type VersionRow = {
	id: string;
	version: number;
	name: string;
	description: string;
	instructions: string;
	contentHash: string;
};

describe('MoveAgentSkillsToProjects migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let projectId: string;
	let skillCount: number;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const initial = createTestMigrationContext(dataSource);
		try {
			await initial.queryRunner.clearDatabase();
		} finally {
			await initial.queryRunner.release();
		}
		await initDbUpToMigration(migrationName);
		context = createTestMigrationContext(dataSource);
		projectId = await insertProject('Sales');
		skillCount = 0;
	});

	afterEach(async () => {
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	/** Releases the test connection while the migration runs: SQLite would wait on it. */
	async function migrate() {
		await context.queryRunner.release();
		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
	}

	const table = (name: string) => context.escape.tableName(name);
	const column = (name: string) => context.escape.columnName(name);

	async function insertRow(tableName: string, values: Row) {
		const names = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${table(tableName)} (${names.map(column).join(', ')})
			 VALUES (${names.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	}

	async function select<T>(sql: string, params: Row = {}): Promise<T[]> {
		return await context.runQuery<T[]>(sql, params);
	}

	async function insertProject(name: string) {
		const id = randomUUID();
		await insertRow('project', { id, name, type: 'team' });
		return id;
	}

	async function insertAgent(name: string, agentProjectId: string | null) {
		const id = randomUUID();
		await insertRow('agents', {
			id,
			name,
			projectId: agentProjectId,
			scope: agentProjectId === null ? 'instance' : 'project',
			schema: JSON.stringify({ name, model: 'anthropic/claude' }),
			integrations: '[]',
			tools: '{}',
		});
		return id;
	}

	/** A skill with one version per name in `names`, the last one the latest. */
	async function insertSkill(
		target: { projectId?: string; agentId?: string },
		names: string[],
		files: Array<{ path: string; content: string }> = [],
	) {
		skillCount++;
		const id = `skill_${skillCount}`;
		await insertRow('skill', {
			id,
			projectId: target.projectId ?? null,
			agentId: target.agentId ?? null,
			source: 'agent',
			createdAt: `2026-01-01 00:${String(skillCount).padStart(2, '0')}:00.000`,
		});
		for (const [index, name] of names.entries()) {
			const versionId = randomUUID();
			await insertRow('skill_version', {
				id: versionId,
				skillId: id,
				version: index + 1,
				name,
				description: `Use for ${name}`,
				instructions: `Do ${name}.`,
				frontmatter: index === names.length - 1 ? JSON.stringify({ license: 'MIT' }) : null,
				contentHash: 'a'.repeat(64),
			});
			for (const file of files) {
				await insertRow('skill_file', { skillVersionId: versionId, ...file });
			}
		}
		return id;
	}

	async function skillOf(skillId: string) {
		const [row] = await select<SkillRow>(
			`SELECT ${column('id')}, ${column('projectId')} FROM ${table('skill')} WHERE ${column('id')} = :skillId`,
			{ skillId },
		);
		return row;
	}

	async function versionsOf(skillId: string) {
		return await select<VersionRow>(
			`SELECT ${['id', 'version', 'name', 'description', 'instructions', 'contentHash'].map(column).join(', ')}
			 FROM ${table('skill_version')} WHERE ${column('skillId')} = :skillId ORDER BY ${column('version')}`,
			{ skillId },
		);
	}

	async function latestName(skillId: string) {
		const versions = await versionsOf(skillId);
		return versions[versions.length - 1].name;
	}

	it('moves an agent skill to the project of its agent and drops agentId', async () => {
		const agentId = await insertAgent('Writer', projectId);
		const skillId = await insertSkill({ agentId }, ['Tone']);
		await insertRow('agent_skill_dependency', { agentId, skillId, skillVersionId: null });

		await migrate();

		expect(await skillOf(skillId)).toEqual({ id: skillId, projectId });
		expect(await versionsOf(skillId)).toHaveLength(1);
		const dependencies = await select<{ skillId: string }>(
			`SELECT ${column('skillId')} FROM ${table('agent_skill_dependency')} WHERE ${column('agentId')} = :agentId`,
			{ agentId },
		);
		expect(dependencies).toEqual([{ skillId }]);
		const skillTable = await context.queryRunner.getTable(`${context.tablePrefix}skill`);
		expect(skillTable?.findColumnByName('agentId')).toBeUndefined();
	});

	it('keeps published pins on the version they pinned', async () => {
		await insertSkill({ projectId }, ['Research']);
		const agentId = await insertAgent('Scout', projectId);
		const skillId = await insertSkill({ agentId }, ['Research']);
		const [pinned] = await versionsOf(skillId);
		const agentVersionId = randomUUID();
		await insertRow('agent_history', { versionId: agentVersionId, agentId, author: 'Ricardo' });
		await insertRow('agent_version_skill_dependency', {
			agentVersionId,
			skillId,
			skillVersionId: pinned.id,
		});

		await migrate();

		const pins = await select<{ skillId: string; skillVersionId: string }>(
			`SELECT ${column('skillId')}, ${column('skillVersionId')} FROM ${table('agent_version_skill_dependency')}
			 WHERE ${column('agentVersionId')} = :agentVersionId`,
			{ agentVersionId },
		);
		expect(pins).toEqual([{ skillId, skillVersionId: pinned.id }]);
		expect(await latestName(skillId)).toBe('Research (Scout)');
	});

	it('keeps the skill when its agent is deleted after the move', async () => {
		const agentId = await insertAgent('Writer', projectId);
		const skillId = await insertSkill({ agentId }, ['Tone']);

		await migrate();
		await context.runQuery(`DELETE FROM ${table('agents')} WHERE ${column('id')} = :agentId`, {
			agentId,
		});

		expect(await skillOf(skillId)).toEqual({ id: skillId, projectId });
	});

	it('moves the skill of an agent without a project to the instance', async () => {
		const agentId = await insertAgent('Helper', null);
		const skillId = await insertSkill({ agentId }, ['Tone']);

		await migrate();

		expect(await skillOf(skillId)).toEqual({ id: skillId, projectId: null });
	});

	it('adds a renamed version when the project already has the name', async () => {
		await insertSkill({ projectId }, ['Research']);
		const agentId = await insertAgent('Scout', projectId);
		const files = [
			{ path: 'references/b.md', content: 'B' },
			{ path: 'references/a.md', content: 'A' },
		];
		const skillId = await insertSkill({ agentId }, ['Draft', 'RESEARCH'], files);

		await migrate();

		const versions = await versionsOf(skillId);
		expect(versions.map((version) => [version.version, version.name])).toEqual([
			[1, 'Draft'],
			[2, 'RESEARCH'],
			[3, 'RESEARCH (Scout)'],
		]);
		const renamed = versions[2];
		const copiedFiles = await select<{ path: string; content: string }>(
			`SELECT ${column('path')}, ${column('content')} FROM ${table('skill_file')}
			 WHERE ${column('skillVersionId')} = :id ORDER BY ${column('path')}`,
			{ id: renamed.id },
		);
		expect(copiedFiles).toEqual([
			{ path: 'references/a.md', content: 'A' },
			{ path: 'references/b.md', content: 'B' },
		]);
		expect(renamed.contentHash).toBe(
			skillContentHash({
				name: renamed.name,
				description: renamed.description,
				instructions: renamed.instructions,
				frontmatter: { license: 'MIT' },
				files: copiedFiles,
			}),
		);
	});

	it('lets the oldest agent skill keep a name that two agents use', async () => {
		const first = await insertSkill({ agentId: await insertAgent('Scout', projectId) }, [
			'Research',
		]);
		const second = await insertSkill({ agentId: await insertAgent('Closer', projectId) }, [
			'Research',
		]);
		const third = await insertSkill({ agentId: await insertAgent('Closer', projectId) }, [
			'Research',
		]);

		await migrate();

		expect(await latestName(first)).toBe('Research');
		expect(await latestName(second)).toBe('Research (Closer)');
		expect(await latestName(third)).toBe('Research (Closer) 2');
	});

	it('checks names only against the target of each skill', async () => {
		const otherProjectId = await insertProject('Support');
		await insertSkill({ projectId: otherProjectId }, ['Research']);
		await insertSkill({}, ['Research']);
		const skillId = await insertSkill({ agentId: await insertAgent('Scout', projectId) }, [
			'Research',
		]);
		const instanceSkillId = await insertSkill({ agentId: await insertAgent('Helper', null) }, [
			'Research',
		]);

		await migrate();

		expect(await latestName(skillId)).toBe('Research');
		expect(await latestName(instanceSkillId)).toBe('Research (Helper)');
	});

	it('finds a free name when the skill and agent names are as long as allowed', async () => {
		const longName = 'R'.repeat(128);
		const agentName = 'A'.repeat(128);
		await insertSkill({ projectId }, [longName]);
		const first = await insertSkill({ agentId: await insertAgent(agentName, projectId) }, [
			longName,
		]);
		const second = await insertSkill({ agentId: await insertAgent(agentName, projectId) }, [
			longName,
		]);

		await migrate();

		const firstName = await latestName(first);
		const secondName = await latestName(second);
		expect(firstName).toHaveLength(128);
		expect(secondName).toHaveLength(128);
		expect(firstName.endsWith(` (${'A'.repeat(64)})`)).toBe(true);
		expect(secondName.endsWith(` (${'A'.repeat(64)}) 2`)).toBe(true);
	});

	it('shortens a long name so the new name fits', async () => {
		const longName = 'R'.repeat(128);
		await insertSkill({ projectId }, [longName]);
		const skillId = await insertSkill({ agentId: await insertAgent('Scout', projectId) }, [
			longName,
		]);

		await migrate();

		const name = await latestName(skillId);
		expect(name).toHaveLength(128);
		expect(name.endsWith(' (Scout)')).toBe(true);
	});
});
