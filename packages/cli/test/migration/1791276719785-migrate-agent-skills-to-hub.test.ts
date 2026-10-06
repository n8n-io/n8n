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

const MIGRATION_NAME = 'MigrateAgentSkillsToHub1791276719785';

type SkillBody = {
	name: string;
	description: string;
	instructions: string;
	allowedTools?: string[];
	references?: Array<{ path: string; content: string }>;
};

type SkillRow = { id: string; userId: string | null; projectId: string | null; source: string };
type VersionRow = {
	id: string;
	skillId: string;
	version: number | null;
	name: string;
	instructions: string;
	frontmatter: string | null;
	contentHash: string;
};
type FileRow = { skillVersionId: string; path: string; position: number; content: string };
type DependencyRow = { agentId: string; skillId: string; skillVersionId: string | null };
type PinRow = { agentVersionId: string; skillRefId: string; skillVersionId: string };

/** Postgres returns json columns parsed, SQLite as text. */
const asJson = <T>(value: string | T): T =>
	typeof value === 'string' ? (JSON.parse(value) as T) : value;

const body = (name: string, instructions: string, extra: Partial<SkillBody> = {}): SkillBody => ({
	name,
	description: `${name} description`,
	instructions,
	...extra,
});

describe('MigrateAgentSkillsToHub Migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	// ---------------------------------------------------------------- fixtures

	const cols = (context: TestMigrationContext, names: string[]) =>
		names.map((name) => context.escape.columnName(name)).join(', ');

	async function insertUser(context: TestMigrationContext, id: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('user')} (${cols(context, ['id', 'email', 'firstName', 'lastName', 'password', 'roleSlug', 'createdAt', 'updatedAt'])})
			 VALUES (:id, :email, 'Test', 'User', 'hashed', :roleSlug, :createdAt, :updatedAt)`,
			// The role goes in as a parameter: the Postgres helper reads `:member` in a literal as a placeholder.
			{
				id,
				email: `${id}@test.com`,
				roleSlug: 'global:member',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertProject(
		context: TestMigrationContext,
		id: string,
		type: 'personal' | 'team',
		ownerId?: string,
	) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} (${cols(context, ['id', 'name', 'type', 'createdAt', 'updatedAt'])})
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{ id, name: `project-${id}`, type, createdAt: new Date(), updatedAt: new Date() },
		);
		if (ownerId) {
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('project_relation')} (${cols(context, ['userId', 'projectId', 'role', 'createdAt', 'updatedAt'])})
				 VALUES (:userId, :projectId, :role, :createdAt, :updatedAt)`,
				{
					userId: ownerId,
					projectId: id,
					role: 'project:personalOwner',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			);
		}
	}

	async function insertAgent(
		context: TestMigrationContext,
		data: {
			id: string;
			projectId: string;
			/** Ids of the skill refs, or the raw `schema.skills` value for malformed cases. */
			refs: string[] | unknown;
			/** The `agents.skills` map, or a raw string for malformed JSON. */
			skills: Record<string, unknown> | string;
			createdAt?: Date;
		},
	) {
		const refs = Array.isArray(data.refs)
			? data.refs.map((id) => ({ type: 'skill', id }))
			: data.refs;
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')}
			   (${cols(context, ['id', 'name', 'projectId', 'schema', 'integrations', 'tools', 'skills', 'createdAt', 'updatedAt'])})
			 VALUES (:id, :name, :projectId, :schema, '[]', '{}', :skills, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: `agent-${data.id}`,
				projectId: data.projectId,
				schema: JSON.stringify({ name: `agent-${data.id}`, skills: refs }),
				skills: typeof data.skills === 'string' ? data.skills : JSON.stringify(data.skills),
				createdAt: data.createdAt ?? new Date(),
				updatedAt: data.createdAt ?? new Date(),
			},
		);
	}

	async function insertHistory(
		context: TestMigrationContext,
		data: {
			versionId: string;
			agentId: string;
			skills: Record<string, SkillBody> | null;
			createdAt: Date;
		},
	) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_history')}
			   (${cols(context, ['versionId', 'agentId', 'author', 'skills', 'createdAt', 'updatedAt'])})
			 VALUES (:versionId, :agentId, 'Test User', :skills, :createdAt, :updatedAt)`,
			{
				versionId: data.versionId,
				agentId: data.agentId,
				skills: data.skills === null ? null : JSON.stringify(data.skills),
				createdAt: data.createdAt,
				updatedAt: data.createdAt,
			},
		);
	}

	// ---------------------------------------------------------------- reads

	const select = async <T>(context: TestMigrationContext, table: string, orderBy: string[]) =>
		await context.runQuery<T[]>(
			`SELECT * FROM ${context.escape.tableName(table)} ORDER BY ${cols(context, orderBy)}`,
		);

	async function readAgent(context: TestMigrationContext, agentId: string) {
		const [row] = await context.runQuery<Array<{ schema: string; skills: string }>>(
			`SELECT ${cols(context, ['schema', 'skills'])} FROM ${context.escape.tableName('agents')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id: agentId },
		);
		return {
			refs: asJson<{ skills: Array<{ id: string }> }>(row.schema).skills.map((r) => r.id),
			skills: asJson<Record<string, SkillBody>>(row.skills),
		};
	}

	const savedVersions = (versions: VersionRow[]) =>
		versions.filter((v) => v.version !== null).sort((a, b) => a.version! - b.version!);

	// ---------------------------------------------------------------- tests

	it('gives a team agent its skill as a project skill, with a draft row and one saved version', async () => {
		const brandVoice = body('Brand voice', 'Be warm.', {
			allowedTools: ['search'],
			references: [
				{ path: 'references/tone.md', content: 'Warm.' },
				{ path: 'references/words.md', content: 'Plain.' },
			],
		});
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'team-1',
				refs: ['skill_a'],
				skills: { skill_a: brandVoice },
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const skills = await select<SkillRow>(context, 'skill', ['id']);
			expect(skills).toEqual([
				expect.objectContaining({
					id: 'skill_a',
					userId: null,
					projectId: 'team-1',
					source: 'agent',
				}),
			]);

			const versions = await select<VersionRow>(context, 'skill_version', ['skillId']);
			const draft = versions.find((v) => v.version === null);
			const saved = savedVersions(versions);
			expect(draft).toMatchObject({
				skillId: 'skill_a',
				name: 'Brand voice',
				instructions: 'Be warm.',
			});
			expect(saved.map((v) => v.version)).toEqual([1]);
			expect(saved[0]).toMatchObject({ name: 'Brand voice', contentHash: draft?.contentHash });
			expect(asJson<Record<string, string>>(saved[0].frontmatter!)).toEqual({
				'allowed-tools': 'search',
			});

			const files = await select<FileRow>(context, 'skill_file', ['skillVersionId', 'position']);
			// Two files on the draft row and two on v1, in the order of the references array.
			expect(files).toHaveLength(4);
			expect(files.filter((f) => f.skillVersionId === saved[0].id).map((f) => f.path)).toEqual([
				'references/tone.md',
				'references/words.md',
			]);

			const dependencies = await select<DependencyRow>(context, 'agent_skill_dependency', [
				'agentId',
			]);
			expect(dependencies).toEqual([
				expect.objectContaining({ agentId: 'agent-1', skillId: 'skill_a', skillVersionId: null }),
			]);

			// The agent row is untouched: same ref id, same body under the same key.
			expect(await readAgent(context, 'agent-1')).toEqual({
				refs: ['skill_a'],
				skills: { skill_a: brandVoice },
			});
		});
	});

	it('makes a personal agent\'s skill a "Just you" skill of the project owner', async () => {
		const ownerId = randomUUID();
		await withContext(async (context) => {
			await insertUser(context, ownerId);
			await insertProject(context, 'personal-1', 'personal', ownerId);
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'personal-1',
				refs: ['skill_a'],
				skills: { skill_a: body('Notes', 'Keep notes.') },
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const skills = await select<SkillRow>(context, 'skill', ['id']);
			expect(skills).toEqual([
				expect.objectContaining({ id: 'skill_a', userId: ownerId, projectId: null }),
			]);
		});
	});

	it('keeps a personal project without a live owner as the skill target', async () => {
		await withContext(async (context) => {
			// No project_relation row: the owner is gone.
			await insertProject(context, 'personal-1', 'personal');
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'personal-1',
				refs: ['skill_a'],
				skills: { skill_a: body('Notes', 'Keep notes.') },
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const skills = await select<SkillRow>(context, 'skill', ['id']);
			expect(skills).toEqual([
				expect.objectContaining({ id: 'skill_a', userId: null, projectId: 'personal-1' }),
			]);
		});
	});

	it('turns each published copy into a version, reuses identical text, and pins every agent version', async () => {
		const v1 = body('Brand voice', 'Be warm.');
		const v2 = body('Brand voice', 'Be warm and short.');
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			// The draft already carries the newest text, so no extra version is needed.
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'team-1',
				refs: ['skill_a'],
				skills: { skill_a: v2 },
			});
			await insertHistory(context, {
				versionId: 'hist-1',
				agentId: 'agent-1',
				skills: { skill_a: v1 },
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			});
			await insertHistory(context, {
				versionId: 'hist-2',
				agentId: 'agent-1',
				skills: { skill_a: v1 },
				createdAt: new Date('2026-02-01T00:00:00.000Z'),
			});
			await insertHistory(context, {
				versionId: 'hist-3',
				agentId: 'agent-1',
				skills: { skill_a: v2 },
				createdAt: new Date('2026-03-01T00:00:00.000Z'),
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const saved = savedVersions(await select<VersionRow>(context, 'skill_version', ['skillId']));
			expect(saved.map((v) => [v.version, v.instructions])).toEqual([
				[1, 'Be warm.'],
				[2, 'Be warm and short.'],
			]);

			const pins = await select<PinRow>(context, 'agent_history_skill', ['agentVersionId']);
			const versionById = new Map(saved.map((v) => [v.id, v.version]));
			expect(
				pins.map((p) => [p.agentVersionId, p.skillRefId, versionById.get(p.skillVersionId)]),
			).toEqual([
				['hist-1', 'skill_a', 1],
				['hist-2', 'skill_a', 1],
				['hist-3', 'skill_a', 2],
			]);
			// Published versions keep their JSON copies.
			const history = await context.runQuery<Array<{ skills: string }>>(
				`SELECT ${context.escape.columnName('skills')} FROM ${context.escape.tableName('agent_history')} WHERE ${context.escape.columnName('versionId')} = :id`,
				{ id: 'hist-1' },
			);
			expect(asJson<Record<string, SkillBody>>(history[0].skills)).toEqual({ skill_a: v1 });
		});
	});

	it('saves a draft that was edited after its last publish as the newest version', async () => {
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'team-1',
				refs: ['skill_a'],
				skills: { skill_a: body('Brand voice', 'Edited after publish.') },
			});
			await insertHistory(context, {
				versionId: 'hist-1',
				agentId: 'agent-1',
				skills: { skill_a: body('Brand voice', 'Published text.') },
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const saved = savedVersions(await select<VersionRow>(context, 'skill_version', ['skillId']));
			expect(saved.map((v) => [v.version, v.instructions])).toEqual([
				[1, 'Published text.'],
				[2, 'Edited after publish.'],
			]);
		});
	});

	it('keeps a skill that only published versions use, with its draft on the newest published text', async () => {
		const textA = body('Old rule', 'Text A.');
		const textB = body('Old rule', 'Text B.');
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			// The draft detached the skill: no ref, no body.
			await insertAgent(context, { id: 'agent-1', projectId: 'team-1', refs: [], skills: {} });
			// Published A, then B, then A again: the newest published text is A, an older version.
			for (const [index, skills] of [textA, textB, textA].entries()) {
				await insertHistory(context, {
					versionId: `hist-${index + 1}`,
					agentId: 'agent-1',
					skills: { skill_old: skills },
					createdAt: new Date(`2026-0${index + 1}-01T00:00:00.000Z`),
				});
			}
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const skills = await select<SkillRow>(context, 'skill', ['id']);
			expect(skills.map((s) => s.id)).toEqual(['skill_old']);

			const versions = await select<VersionRow>(context, 'skill_version', ['skillId']);
			const draft = versions.find((v) => v.version === null);
			expect(draft).toMatchObject({ instructions: 'Text A.' });
			// v1 = A, v2 = B, and v3 = A again so that the newest number carries the draft's text.
			expect(savedVersions(versions).map((v) => [v.version, v.instructions])).toEqual([
				[1, 'Text A.'],
				[2, 'Text B.'],
				[3, 'Text A.'],
			]);

			// Nothing in a draft uses it, so there is no dependency row, only the pins.
			expect(await select<DependencyRow>(context, 'agent_skill_dependency', ['agentId'])).toEqual(
				[],
			);
			expect(await select<PinRow>(context, 'agent_history_skill', ['agentVersionId'])).toHaveLength(
				3,
			);
		});
	});

	it("gives a later agent with a duplicated skill id a new id and re-keys only that agent's ref and body", async () => {
		const brandVoice = body('Brand voice', 'Be warm.');
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'team-1',
				refs: ['skill_a'],
				skills: { skill_a: brandVoice },
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			});
			// A duplicate of agent-1 made before the hub: same skill id, own copy.
			await insertAgent(context, {
				id: 'agent-2',
				projectId: 'team-1',
				refs: ['skill_a'],
				skills: { skill_a: brandVoice },
				createdAt: new Date('2026-02-01T00:00:00.000Z'),
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const skills = await select<SkillRow>(context, 'skill', ['createdAt', 'id']);
			expect(skills).toHaveLength(2);
			expect(skills.map((s) => s.id)).toContain('skill_a');
			const minted = skills.find((s) => s.id !== 'skill_a')!;
			expect(minted.id).toMatch(/^skill_[A-Za-z0-9]{16}$/);

			expect(await readAgent(context, 'agent-1')).toEqual({
				refs: ['skill_a'],
				skills: { skill_a: brandVoice },
			});
			// The body follows the ref, so the agent keeps reading its copy before hub reads land.
			expect(await readAgent(context, 'agent-2')).toEqual({
				refs: [minted.id],
				skills: { [minted.id]: brandVoice },
			});

			const dependencies = await select<DependencyRow>(context, 'agent_skill_dependency', [
				'agentId',
			]);
			expect(dependencies.map((d) => [d.agentId, d.skillId])).toEqual([
				['agent-1', 'skill_a'],
				['agent-2', minted.id],
			]);
		});
	});

	it('mints a new id for a ref longer than the skill id column', async () => {
		const longId = `skill_${'x'.repeat(40)}`;
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'team-1',
				refs: [longId],
				skills: { [longId]: body('Long id', 'Body.') },
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const [skill] = await select<SkillRow>(context, 'skill', ['id']);
			expect(skill.id).toMatch(/^skill_[A-Za-z0-9]{16}$/);
			const agent = await readAgent(context, 'agent-1');
			expect(agent.refs).toEqual([skill.id]);
			expect(Object.keys(agent.skills)).toEqual([skill.id]);
		});
	});

	it('skips refs without a body and bodies without a ref, and tolerates a NULL history skills column', async () => {
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'team-1',
				refs: ['skill_missing', 'skill_a'],
				skills: {
					skill_a: body('Brand voice', 'Be warm.'),
					skill_orphan: body('Orphan', 'Never referenced.'),
					skill_bad: { name: 'No instructions' },
				},
			});
			await insertHistory(context, {
				versionId: 'hist-1',
				agentId: 'agent-1',
				skills: null,
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const skills = await select<SkillRow>(context, 'skill', ['id']);
			expect(skills.map((s) => s.id)).toEqual(['skill_a']);
			// The dangling ref stays as it is, for validation to report.
			expect((await readAgent(context, 'agent-1')).refs).toEqual(['skill_missing', 'skill_a']);
			expect(await select<PinRow>(context, 'agent_history_skill', ['agentVersionId'])).toEqual([]);
		});
	});

	it('drops malformed optional fields, ignores a non-array ref list, and skips a row with broken JSON', async () => {
		await withContext(async (context) => {
			await insertProject(context, 'team-1', 'team');
			await insertAgent(context, {
				id: 'agent-1',
				projectId: 'team-1',
				refs: ['skill_a'],
				skills: {
					skill_a: {
						...body('Brand voice', 'Be warm.'),
						allowedTools: 'search',
						references: [{ path: 'references/ok.md', content: 'Fine.' }, { path: 42 }, 'bad'],
					},
				},
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			});
			await insertAgent(context, {
				id: 'agent-2',
				projectId: 'team-1',
				refs: { not: 'a list' },
				skills: { skill_b: body('Unreferenced', 'Never read.') },
				createdAt: new Date('2026-02-01T00:00:00.000Z'),
			});
			// Postgres rejects invalid JSON at insert time, so only SQLite can hold such a row.
			if (context.isSqlite) {
				await insertAgent(context, {
					id: 'agent-3',
					projectId: 'team-1',
					refs: ['skill_c'],
					skills: '{not json',
					createdAt: new Date('2026-03-01T00:00:00.000Z'),
				});
			}
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const skills = await select<SkillRow>(context, 'skill', ['id']);
			expect(skills.map((s) => s.id)).toEqual(['skill_a']);

			const versions = await select<VersionRow>(context, 'skill_version', ['skillId']);
			// The string `allowedTools` is dropped, so there is no frontmatter.
			expect(versions.every((v) => v.frontmatter === null)).toBe(true);
			const files = await select<FileRow>(context, 'skill_file', ['skillVersionId', 'position']);
			// Only the well-formed reference survives, on the draft row and on v1.
			expect(files.map((f) => f.path)).toEqual(['references/ok.md', 'references/ok.md']);

			// The broken row is left as it is.
			if (context.isSqlite) {
				const [agent3] = await context.runQuery<Array<{ skills: string }>>(
					`SELECT ${context.escape.columnName('skills')} FROM ${context.escape.tableName('agents')} WHERE ${context.escape.columnName('id')} = :id`,
					{ id: 'agent-3' },
				);
				expect(agent3.skills).toBe('{not json');
			}
		});
	});
});
