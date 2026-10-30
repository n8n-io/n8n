import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { skillContentHash } from '@/modules/skills/testing';

const migrationName = 'MigrateAgentSkillsToHub1792764566513';

type Row = Record<string, string | number | boolean | null>;
type Body = {
	name: string;
	description: string;
	instructions: string;
	allowedTools?: string[];
	references?: Array<{ path: string; content: string }>;
};
type Ref = { type: 'skill'; id: string; enabled?: boolean };

const body = (name: string, instructions = `Do ${name}.`): Body => ({
	name,
	description: `Use for ${name}`,
	instructions,
});

describe('MigrateAgentSkillsToHub migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let projectId: string;

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
		projectId = randomUUID();
		await insertRow('project', { id: projectId, name: 'Agents', type: 'team' });
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

	/** An agent whose draft has these refs and bodies. `minute` orders agents by `createdAt`. */
	async function insertAgent(refs: Ref[], skills: Record<string, unknown>, minute = 0) {
		const id = randomUUID();
		await insertRow('agents', {
			id,
			name: 'Agent',
			projectId,
			schema: JSON.stringify({ name: 'Agent', model: 'anthropic/claude', skills: refs }),
			skills: JSON.stringify(skills),
			integrations: '[]',
			tools: '{}',
			createdAt: `2026-01-01 00:${String(minute).padStart(2, '0')}:00.000`,
		});
		return id;
	}

	async function insertVersion(
		agentId: string,
		refs: Ref[],
		skills: Record<string, unknown>,
		minute: number,
	) {
		const versionId = randomUUID();
		await insertRow('agent_history', {
			versionId,
			agentId,
			schema: JSON.stringify({ name: 'Agent', skills: refs }),
			skills: JSON.stringify(skills),
			author: 'Test User',
			createdAt: `2026-02-01 00:${String(minute).padStart(2, '0')}:00.000`,
		});
		return versionId;
	}

	const ref = (id: string, extra: Partial<Ref> = {}): Ref => ({ type: 'skill', id, ...extra });

	async function skillsOf(agentId: string) {
		return await select<{ id: string; projectId: string | null; source: string }>(
			`SELECT ${column('id')}, ${column('projectId')}, ${column('source')} FROM ${table('skill')}
			 WHERE ${column('agentId')} = :agentId ORDER BY ${column('id')}`,
			{ agentId },
		);
	}

	/** The draft refs in the order the agent runs them, with the text of their newest version. */
	async function draftOf(agentId: string) {
		const deps = await select<{ skillId: string }>(
			`SELECT ${column('skillId')} FROM ${table('agent_skill_dependency')}
			 WHERE ${column('agentId')} = :agentId ORDER BY ${column('createdAt')}`,
			{ agentId },
		);
		const result = [];
		for (const { skillId } of deps) result.push({ skillId, ...(await latestVersion(skillId)) });
		return result;
	}

	async function latestVersion(skillId: string) {
		const [version] = await select<{
			id: string;
			version: number;
			name: string;
			instructions: string;
		}>(
			`SELECT ${column('id')}, ${column('version')}, ${column('name')}, ${column('instructions')}
			 FROM ${table('skill_version')} WHERE ${column('skillId')} = :skillId
			 ORDER BY ${column('version')} DESC`,
			{ skillId },
		);
		return {
			version: Number(version.version),
			name: version.name,
			instructions: version.instructions,
		};
	}

	/** The pins of one published version, in run order, with the pinned text. */
	async function pinsOf(agentVersionId: string) {
		return await select<{ skillId: string; name: string; instructions: string; version: number }>(
			`SELECT pin.${column('skillId')} AS ${column('skillId')}, v.${column('name')} AS ${column('name')},
			 v.${column('instructions')} AS ${column('instructions')}, v.${column('version')} AS ${column('version')}
			 FROM ${table('agent_version_skill_dependency')} pin
			 INNER JOIN ${table('skill_version')} v ON v.${column('id')} = pin.${column('skillVersionId')}
			 WHERE pin.${column('agentVersionId')} = :agentVersionId ORDER BY pin.${column('createdAt')}`,
			{ agentVersionId },
		);
	}

	async function count(tableName: string) {
		const [row] = await select<{ count: number | string }>(
			`SELECT COUNT(*) AS ${column('count')} FROM ${table(tableName)}`,
		);
		return Number(row.count);
	}

	it('copies the draft skills of an agent as agent skills, in ref order', async () => {
		const agentId = await insertAgent([ref('skill_b'), ref('skill_a')], {
			skill_a: body('alpha'),
			skill_b: body('beta'),
		});

		await migrate();

		expect(await skillsOf(agentId)).toEqual([
			{ id: 'skill_a', projectId: null, source: 'agent' },
			{ id: 'skill_b', projectId: null, source: 'agent' },
		]);
		expect(await draftOf(agentId)).toEqual([
			{ skillId: 'skill_b', version: 1, name: 'beta', instructions: 'Do beta.' },
			{ skillId: 'skill_a', version: 1, name: 'alpha', instructions: 'Do alpha.' },
		]);
	});

	it('pins each published version to versions that hold its bodies', async () => {
		const agentId = await insertAgent([ref('skill_a')], {
			skill_a: body('alpha', 'Version three.'),
		});
		const first = await insertVersion(
			agentId,
			[ref('skill_a')],
			{ skill_a: body('alpha', 'Version one.') },
			1,
		);
		const second = await insertVersion(
			agentId,
			[ref('skill_a')],
			{ skill_a: body('alpha', 'Version two.') },
			2,
		);
		const sameAsFirst = await insertVersion(
			agentId,
			[ref('skill_a')],
			{ skill_a: body('alpha', 'Version one.') },
			3,
		);

		await migrate();

		expect(await pinsOf(first)).toEqual([
			expect.objectContaining({ skillId: 'skill_a', instructions: 'Version one.' }),
		]);
		expect(await pinsOf(second)).toEqual([
			expect.objectContaining({ skillId: 'skill_a', instructions: 'Version two.' }),
		]);
		// Identical content reuses the version that already holds it.
		expect((await pinsOf(sameAsFirst))[0].version).toBe((await pinsOf(first))[0].version);
		// The draft runs the newest version, which holds the draft text.
		expect(await draftOf(agentId)).toEqual([
			{ skillId: 'skill_a', version: 3, name: 'alpha', instructions: 'Version three.' },
		]);
	});

	it('makes the draft text the newest version when an older version already holds it', async () => {
		const agentId = await insertAgent([ref('skill_a')], { skill_a: body('alpha', 'Old text.') });
		await insertVersion(agentId, [ref('skill_a')], { skill_a: body('alpha', 'Old text.') }, 1);
		await insertVersion(agentId, [ref('skill_a')], { skill_a: body('alpha', 'New text.') }, 2);

		await migrate();

		expect(await draftOf(agentId)).toEqual([
			{ skillId: 'skill_a', version: 3, name: 'alpha', instructions: 'Old text.' },
		]);
	});

	it('skips switched-off refs, refs without a body, bodies without a ref and broken bodies', async () => {
		const agentId = await insertAgent(
			[
				ref('skill_off', { enabled: false }),
				ref('skill_missing'),
				ref('skill_broken'),
				ref('skill_ok'),
			],
			{
				skill_off: body('off'),
				skill_broken: { name: 'broken' },
				skill_orphan: body('orphan'),
				skill_ok: body('ok'),
			},
		);

		await migrate();

		expect((await skillsOf(agentId)).map((skill) => skill.id)).toEqual(['skill_ok']);
		expect((await draftOf(agentId)).map((dep) => dep.skillId)).toEqual(['skill_ok']);
	});

	it('gives a new id to a ref id that an earlier agent took, or that is too long', async () => {
		const original = await insertAgent(
			[ref('skill_shared')],
			{ skill_shared: body('original') },
			1,
		);
		const duplicate = await insertAgent(
			[ref('skill_shared')],
			{ skill_shared: body('duplicate') },
			2,
		);
		const longId = `skill_${'x'.repeat(40)}`;
		const long = await insertAgent([ref(longId)], { [longId]: body('long') }, 3);

		await migrate();

		expect(await draftOf(original)).toEqual([
			expect.objectContaining({ skillId: 'skill_shared', name: 'original' }),
		]);
		const [copy] = await draftOf(duplicate);
		expect(copy.skillId).not.toBe('skill_shared');
		expect(copy.name).toBe('duplicate');
		const [renamed] = await draftOf(long);
		expect(renamed.skillId).toMatch(/^skill_/);
		expect(renamed.skillId.length).toBeLessThanOrEqual(36);
		expect(renamed.name).toBe('long');
	});

	it('stores references as files, drops allowedTools and writes the hash the app computes', async () => {
		// A locale-aware sort would put `b.md` first and give another hash than the app.
		const references = [
			{ path: 'references/z.md', content: 'z' },
			{ path: 'references/b.md', content: 'b' },
			{ path: 'references/B.md', content: 'B' },
		];
		const agentId = await insertAgent([ref('skill_a')], {
			skill_a: { ...body('alpha'), allowedTools: ['Read'], references },
		});

		await migrate();

		const [version] = await select<{ id: string; contentHash: string; frontmatter: unknown }>(
			`SELECT ${column('id')}, ${column('contentHash')}, ${column('frontmatter')} FROM ${table('skill_version')}
			 WHERE ${column('skillId')} = 'skill_a'`,
		);
		const files = await select<{ path: string; content: string }>(
			`SELECT ${column('path')}, ${column('content')} FROM ${table('skill_file')}
			 WHERE ${column('skillVersionId')} = :id ORDER BY ${column('path')}`,
			{ id: version.id },
		);
		expect(files.map((file) => file.path).sort()).toEqual(
			references.map((file) => file.path).sort(),
		);
		expect(version.frontmatter).toBeNull();
		expect(version.contentHash).toBe(
			skillContentHash({ ...body('alpha'), frontmatter: null, files: references }),
		);
		expect(await skillsOf(agentId)).toHaveLength(1);
	});

	it('copies nothing on an instance where the startup copy ran', async () => {
		// A user removed every skill from this draft after the startup copy.
		const agentId = await insertAgent([ref('skill_a')], { skill_a: body('alpha') });
		await insertVersion(agentId, [ref('skill_a')], { skill_a: body('alpha') }, 1);
		await insertRow('settings', {
			key: 'agents.skillsHubCopy',
			value: JSON.stringify({ through: null, retryAgentIds: [] }),
			loadOnStartup: false,
		});

		await migrate();

		expect(await count('skill')).toBe(0);
		expect(await count('agent_skill_dependency')).toBe(0);
		expect(await count('agent_version_skill_dependency')).toBe(0);
	});

	// Only Postgres enforces `varchar` lengths, so only there can one agent's write fail.
	it.runIf(process.env.DB_TYPE === 'postgresdb')(
		'skips an agent whose skills cannot be stored and copies the others',
		async () => {
			const broken = await insertAgent(
				[ref('skill_long')],
				{ skill_long: { ...body('long'), description: 'x'.repeat(2000) } },
				1,
			);
			const healthy = await insertAgent([ref('skill_a')], { skill_a: body('alpha') }, 2);
			const report = vi.spyOn(Container.get(ErrorReporter), 'error').mockImplementation(() => {});

			await migrate();

			expect(report).toHaveBeenCalledTimes(1);
			expect(report.mock.calls[0][0]).toMatchObject({
				tags: { migration: migrationName },
				extra: { failed: 1, failures: [{ agentId: broken, error: expect.any(String) }] },
			});
			report.mockRestore();
			expect(await skillsOf(broken)).toEqual([]);
			expect(await draftOf(broken)).toEqual([]);
			expect(await draftOf(healthy)).toEqual([
				{ skillId: 'skill_a', version: 1, name: 'alpha', instructions: 'Do alpha.' },
			]);
		},
	);

	// SQLite compares timestamps as text, so rows the app adds later must sort after these.
	it.runIf((process.env.DB_TYPE ?? 'sqlite') === 'sqlite')(
		'writes ordering timestamps in the format the app writes on SQLite',
		async () => {
			const agentId = await insertAgent([ref('skill_a')], { skill_a: body('alpha') });

			await migrate();

			const [dep] = await select<{ createdAt: string }>(
				`SELECT ${column('createdAt')} FROM ${table('agent_skill_dependency')}
				 WHERE ${column('agentId')} = :agentId`,
				{ agentId },
			);
			expect(dep.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
		},
	);

	it('copies nothing for agents without skills', async () => {
		await insertAgent([], {});
		const report = vi.spyOn(Container.get(ErrorReporter), 'error');

		await migrate();

		expect(report).not.toHaveBeenCalled();
		report.mockRestore();

		expect(await count('skill')).toBe(0);
		expect(await count('agent_skill_dependency')).toBe(0);
	});
});
