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

const migrationName = 'AddSkillSourceHealth1794488303980';
type Values = Record<string, string | number | null>;

describe('AddSkillSourceHealth migration', () => {
	const credentialId = randomUUID().slice(0, 16);
	const privateSource = randomUUID();
	const publicSource = randomUUID();
	const skillId = randomUUID().slice(0, 16);

	async function withContext<T>(run: (ctx: TestMigrationContext) => Promise<T>) {
		const ctx = createTestMigrationContext(Container.get(DataSource));
		try {
			return await run(ctx);
		} finally {
			await ctx.queryRunner.release();
		}
	}

	async function insert(table: string, values: Values) {
		await withContext(async ({ escape, runQuery }) => {
			const fields = Object.keys(values);
			await runQuery(
				`INSERT INTO ${escape.tableName(table)} (${fields.map(escape.columnName).join(', ')}) VALUES (${fields.map((field) => `:${field}`).join(', ')})`,
				values,
			);
		});
	}

	async function sources() {
		return await withContext(
			async ({ escape, runQuery }) =>
				await runQuery<
					{
						id: string;
						requiresCredential: boolean | number;
						credentialVersion: number;
						credentialId: string | null;
					}[]
				>(`SELECT * FROM ${escape.tableName('skill_source')}`),
		);
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		await insert('credentials_entity', {
			id: credentialId,
			name: 'GitHub',
			type: 'githubApi',
			data: 'encrypted',
		});
		for (const id of [privateSource, publicSource]) {
			await insert('skill_source', {
				id,
				type: 'github',
				locator: '{}',
				identityKey: id,
				credentialId: id === privateSource ? credentialId : null,
			});
		}
		await insert('skill', { id: skillId, source: 'github' });
		await insert('skill_source_link', {
			skillId,
			sourceId: privateSource,
			remoteRef: '{}',
			baseRevision: 'revision',
			baseContentHash: 'hash',
			skippedFiles: '[]',
		});
		await runSingleMigration(migrationName);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('backfills credential access and preserves linked skills', async () => {
		const rows = await sources();
		expect(Boolean(rows.find(({ id }) => id === privateSource)?.requiresCredential)).toBe(true);
		expect(Boolean(rows.find(({ id }) => id === publicSource)?.requiresCredential)).toBe(false);
		expect(rows.every(({ credentialVersion }) => credentialVersion === 0)).toBe(true);
		const links = await withContext(
			async ({ escape, runQuery }) =>
				await runQuery<{ sourceUnavailable: boolean | number }[]>(
					`SELECT * FROM ${escape.tableName('skill_source_link')}`,
				),
		);
		expect(links).toHaveLength(1);
		expect(Boolean(links[0].sourceUnavailable)).toBe(false);
	});

	it('preserves the access mode after credential deletion', async () => {
		await withContext(
			async ({ escape, runQuery }) =>
				await runQuery(
					`DELETE FROM ${escape.tableName('credentials_entity')} WHERE ${escape.columnName('id')} = :id`,
					{ id: credentialId },
				),
		);
		const row = (await sources()).find(({ id }) => id === privateSource);
		expect(row?.credentialId).toBeNull();
		expect(Boolean(row?.requiresCredential)).toBe(true);
	});

	it('reverts and reapplies without removing sources or linked skills', async () => {
		await undoLastSingleMigration();
		await runSingleMigration(migrationName);
		expect(await sources()).toHaveLength(2);
		const rows = await withContext(
			async ({ escape, runQuery }) =>
				await runQuery<unknown[]>(`SELECT * FROM ${escape.tableName('skill_source_link')}`),
		);
		expect(rows).toHaveLength(1);
	});
});
