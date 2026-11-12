import { createTestMigrationContext } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, wrapMigration, type Migration } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type QueryRunner } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { diffSnapshots, snapshotSchema } from './shared/schema-snapshot';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

// In the migrations directory, so the migrations-review team must approve every change.
const BASELINE_PATH = path.join(
	REPO_ROOT,
	'packages/@n8n/db/src/migrations/down-round-trip.baseline.json',
);

type DbType = 'sqlite' | 'postgresdb';
type Baseline = Record<DbType, string[]>;

type WrappedMigration = {
	transaction?: false;
	withFKsDisabled?: true;
	up(queryRunner: QueryRunner): Promise<void>;
	down?(queryRunner: QueryRunner): Promise<void>;
};

type Snapshot = (queryRunner: QueryRunner) => Promise<string[]>;

const readBaseline = () => jsonParse<Baseline>(readFileSync(BASELINE_PATH, 'utf8'));

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Runs `down` and checks that the schema matches `beforeUp`. Then runs `up` again and checks
 * that the schema matches `afterUp`. A failed check rolls back to the schema after the first
 * `up`, so the next migrations still run.
 */
async function roundTrip(
	migration: WrappedMigration,
	down: NonNullable<WrappedMigration['down']>,
	queryRunner: QueryRunner,
	snapshot: Snapshot,
	beforeUp: string[],
	afterUp: string[],
): Promise<string[]> {
	await queryRunner.startTransaction();
	try {
		await down.call(migration, queryRunner);
		let diff = diffSnapshots(beforeUp, await snapshot(queryRunner));
		if (diff.length === 0) {
			await migration.up(queryRunner);
			diff = diffSnapshots(afterUp, await snapshot(queryRunner)).map(
				(line) => `after second up: ${line}`,
			);
		}
		if (diff.length === 0) await queryRunner.commitTransaction();
		else await queryRunner.rollbackTransaction();
		return diff;
	} catch (error) {
		await queryRunner.rollbackTransaction();
		return [`throws: ${errorMessage(error)}`];
	}
}

/**
 * Runs `up`, then checks the round trip of a reversible migration. Each migration gets a new
 * query runner, because a rollback leaves the cached table metadata of a runner out of date.
 */
async function checkMigration(
	dataSource: DataSource,
	migration: WrappedMigration,
	snapshot: Snapshot,
): Promise<string[]> {
	// The runner turns foreign keys off and opens the transactions, so the migration must not.
	migration.withFKsDisabled = undefined;
	// `wrapMigration` puts a getter-only `transaction` on the prototype.
	Object.defineProperty(migration, 'transaction', { value: undefined, configurable: true });

	const queryRunner = dataSource.createQueryRunner();
	try {
		// On SQLite this turns foreign keys off, like the migration executor.
		await queryRunner.beforeMigration();
		const beforeUp = migration.down ? await snapshot(queryRunner) : [];
		await queryRunner.startTransaction();
		try {
			await migration.up(queryRunner);
			await queryRunner.commitTransaction();
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		}
		if (!migration.down) return [];

		const afterUp = await snapshot(queryRunner);
		return await roundTrip(migration, migration.down, queryRunner, snapshot, beforeUp, afterUp);
	} finally {
		await queryRunner.afterMigration();
		await queryRunner.release();
	}
}

describe('Reversible migrations', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	test('each `down` restores the schema from before its `up`', async () => {
		const { type, tablePrefix } = Container.get(GlobalConfig).database;
		if (type !== 'sqlite' && type !== 'postgresdb') throw new Error(`Unexpected ${String(type)}`);
		const dbType: DbType = type;
		const snapshot: Snapshot = async (queryRunner) =>
			await snapshotSchema(queryRunner, dbType, tablePrefix);

		(dataSource.options.migrations as Migration[]).forEach(wrapMigration);

		const problems = new Map<string, string[]>();
		// TypeORM creates these instances before they are wrapped, as in production.
		for (const instance of dataSource.migrations) {
			const name = instance.name ?? instance.constructor.name;
			const migration = instance as unknown as WrappedMigration;
			const problem = await checkMigration(dataSource, migration, snapshot);
			if (problem.length > 0) problems.set(name, problem);
		}

		const failing = [...problems.keys()].sort();

		if (process.env.UPDATE_ROUND_TRIP_BASELINE === 'true') {
			const baseline = readBaseline();
			baseline[dbType] = failing;
			writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, '\t')}\n`);
			return;
		}

		const known = new Set(readBaseline()[dbType]);
		const added = Object.fromEntries(
			failing.filter((name) => !known.has(name)).map((name) => [name, problems.get(name)]),
		);
		const fixed = [...known].filter((name) => !problems.has(name));

		expect
			.soft(
				added,
				[
					`A migration's \`down\` does not restore the ${dbType} schema from before its \`up\`.`,
					'Lines with "-" are missing after `down`. Lines with "+" are left over after `down`.',
					'See "Reversibility" in .agents/skills/db-migrations/SKILL.md.',
				].join(' '),
			)
			.toEqual({});
		expect
			.soft(
				fixed,
				`These migrations are fixed. Remove them from ${path.relative(REPO_ROOT, BASELINE_PATH)}.`,
			)
			.toEqual([]);
	}, 300_000);
});
