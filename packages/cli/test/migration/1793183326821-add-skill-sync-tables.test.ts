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

const migrationName = 'AddSkillSyncTables1793183326821';

type Row = Record<string, string | number | Date | null>;

describe('AddSkillSyncTables migration', () => {
	/** A skill version from before the migration. */
	let oldVersionId: string;

	const withContext = async <T>(run: (context: TestMigrationContext) => Promise<T>) => {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	};

	// Each query gives its connection back: the Postgres tests have a pool of one, and the
	// revert needs that connection.
	const query = async <T = unknown>(sql: (context: TestMigrationContext) => string, values?: Row) =>
		await withContext(async (context) => await context.runQuery<T>(sql(context), values));

	const insertRow = async (tableName: string, values: Row) => {
		const columns = Object.keys(values);
		await query(
			({ escape }) => `INSERT INTO ${escape.tableName(tableName)}
			 (${columns.map((name) => escape.columnName(name)).join(', ')})
			 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	};

	const deleteRow = async (tableName: string, column: string, value: string) =>
		await query(
			({ escape }) =>
				`DELETE FROM ${escape.tableName(tableName)} WHERE ${escape.columnName(column)} = :value`,
			{ value },
		);

	const selectRows = async <T>(tableName: string, columns: string[], key: string, value: string) =>
		await query<T[]>(
			({ escape }) =>
				`SELECT ${columns.map((name) => escape.columnName(name)).join(', ')}
				 FROM ${escape.tableName(tableName)} WHERE ${escape.columnName(key)} = :value`,
			{ value },
		);

	const countRows = async (tableName: string, column: string, value: string) =>
		(await selectRows(tableName, [column], column, value)).length;

	const hasTable = async (tableName: string) =>
		await withContext(
			async ({ queryRunner, tablePrefix }) =>
				await queryRunner.hasTable(`${tablePrefix}${tableName}`),
		);

	const hasSourceRevision = async () =>
		await withContext(
			async ({ queryRunner, tablePrefix }) =>
				await queryRunner.hasColumn(`${tablePrefix}skill_version`, 'sourceRevision'),
		);

	const insertUser = async () => {
		const id = randomUUID();
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
		await insertRow('project', { id, name: 'Skill Sync project', type: 'team' });
		return id;
	};

	const insertCredential = async () => {
		const id = randomUUID().slice(0, 16);
		await insertRow('credentials_entity', {
			id,
			name: 'GitHub token',
			data: 'encrypted',
			type: 'githubApi',
		});
		return id;
	};

	/** A skill with one version. */
	const insertSkill = async (version: Row = {}) => {
		const skillId = `skill_${randomUUID().slice(0, 16)}`;
		await insertRow('skill', { id: skillId, source: 'github' });
		const versionId = randomUUID();
		await insertRow('skill_version', {
			id: versionId,
			skillId,
			version: 1,
			name: 'Brand voice',
			description: 'Use when writing emails',
			instructions: 'Write in a warm tone.',
			contentHash: 'a'.repeat(64),
			...version,
		});
		return { skillId, versionId };
	};

	const insertSource = async (values: Row = {}) => {
		const id = randomUUID();
		await insertRow('skill_source', {
			id,
			type: 'github',
			locator: JSON.stringify({ owner: 'acme', repo: 'skills' }),
			identityKey: `github:github.com/acme/${id}`,
			...values,
		});
		return id;
	};

	const insertLink = async (skillId: string, sourceId: string, values: Row = {}) =>
		await insertRow('skill_source_link', {
			skillId,
			sourceId,
			remoteRef: JSON.stringify({ path: 'skills/brand-voice' }),
			baseRevision: 'a1b2c3',
			baseContentHash: 'b'.repeat(64),
			skippedFiles: '[]',
			...values,
		});

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		oldVersionId = (await insertSkill()).versionId;
		await runSingleMigration(migrationName);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('gives a new source the status connected and a new link the state up_to_date', async () => {
		const sourceId = await insertSource();
		const { skillId } = await insertSkill();
		await insertLink(skillId, sourceId);

		expect(await selectRows('skill_source', ['status'], 'id', sourceId)).toEqual([
			{ status: 'connected' },
		]);
		expect(await selectRows('skill_source_link', ['state'], 'skillId', skillId)).toEqual([
			{ state: 'up_to_date' },
		]);
	});

	it('allows one source for each repository in each project', async () => {
		const [projectA, projectB] = [await insertProject(), await insertProject()];
		const identityKey = 'github:github.com/acme/project-skills';
		await insertSource({ identityKey, projectId: projectA });

		await expect(insertSource({ identityKey, projectId: projectA })).rejects.toThrow();
		await insertSource({ identityKey, projectId: projectB });
		await insertSource({ identityKey, projectId: null });
	});

	it('allows one Global source for each repository', async () => {
		const identityKey = 'github:github.com/acme/global-skills';
		await insertSource({ identityKey, projectId: null });

		await expect(insertSource({ identityKey, projectId: null })).rejects.toThrow();
	});

	it('rejects an unknown source status and an unknown link state', async () => {
		await expect(insertSource({ status: 'paused' })).rejects.toThrow();

		const sourceId = await insertSource();
		const { skillId } = await insertSkill();
		await expect(insertLink(skillId, sourceId, { state: 'paused' })).rejects.toThrow();
	});

	it('deletes the sources of a deleted project with their links, and keeps the skills', async () => {
		const projectId = await insertProject();
		const sourceId = await insertSource({ projectId });
		const { skillId } = await insertSkill();
		await insertLink(skillId, sourceId);

		await deleteRow('project', 'id', projectId);

		expect(await countRows('skill_source', 'id', sourceId)).toBe(0);
		expect(await countRows('skill_source_link', 'skillId', skillId)).toBe(0);
		expect(await countRows('skill', 'id', skillId)).toBe(1);
	});

	it('keeps a source when its credential or its creator is deleted', async () => {
		const credentialId = await insertCredential();
		const createdById = await insertUser();
		const sourceId = await insertSource({ credentialId, createdById });

		await deleteRow('credentials_entity', 'id', credentialId);
		await deleteRow('user', 'id', createdById);

		expect(
			await selectRows('skill_source', ['credentialId', 'createdById'], 'id', sourceId),
		).toEqual([{ credentialId: null, createdById: null }]);
	});

	it('deletes the link of a deleted skill, and keeps the source', async () => {
		const sourceId = await insertSource();
		const { skillId } = await insertSkill();
		await insertLink(skillId, sourceId);

		await deleteRow('skill', 'id', skillId);

		expect(await countRows('skill_source_link', 'skillId', skillId)).toBe(0);
		expect(await countRows('skill_source', 'id', sourceId)).toBe(1);
	});

	it('deletes the links of a deleted source, and keeps the skills', async () => {
		const sourceId = await insertSource();
		const { skillId } = await insertSkill();
		await insertLink(skillId, sourceId);

		await deleteRow('skill_source', 'id', sourceId);

		expect(await countRows('skill_source_link', 'skillId', skillId)).toBe(0);
		expect(await countRows('skill', 'id', skillId)).toBe(1);
	});

	it('adds sourceRevision to skill versions, empty on the versions from before', async () => {
		const { versionId } = await insertSkill({ sourceRevision: 'a1b2c3' });

		expect(await selectRows('skill_version', ['sourceRevision'], 'id', versionId)).toEqual([
			{ sourceRevision: 'a1b2c3' },
		]);
		expect(await selectRows('skill_version', ['sourceRevision'], 'id', oldVersionId)).toEqual([
			{ sourceRevision: null },
		]);
	});

	// Runs last: it reverts the migration, then applies it again.
	it('reverts to the old schema, keeps the skill versions, and applies again', async () => {
		const sourceId = await insertSource();
		const { skillId, versionId } = await insertSkill({ sourceRevision: 'a1b2c3' });
		await insertLink(skillId, sourceId);

		await undoLastSingleMigration();

		expect(await hasTable('skill_source')).toBe(false);
		expect(await hasTable('skill_source_link')).toBe(false);
		expect(await hasSourceRevision()).toBe(false);
		expect(await countRows('skill_version', 'id', versionId)).toBe(1);
		expect(await countRows('skill_version', 'id', oldVersionId)).toBe(1);

		await runSingleMigration(migrationName);

		expect(await hasTable('skill_source')).toBe(true);
		expect(await hasTable('skill_source_link')).toBe(true);
		expect(await hasSourceRevision()).toBe(true);
	});
});
