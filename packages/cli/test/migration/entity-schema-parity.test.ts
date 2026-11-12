import { createTestMigrationContext } from '@n8n/backend-test-utils';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, getMetadataArgsStorage } from '@n8n/typeorm';
import fg from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { findEntitySchemaMismatches } from './shared/entity-schema-parity';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

// In the migrations directory, so the migrations-review team must approve every change.
const BASELINE_PATH = path.join(
	REPO_ROOT,
	'packages/@n8n/db/src/migrations/entity-schema-parity.baseline.json',
);

type Baseline = Record<'sqlite' | 'postgresdb', string[]>;

const readBaseline = () => jsonParse<Baseline>(readFileSync(BASELINE_PATH, 'utf8'));

// Loads the built module entities with Node, like the migrations. Transforming the sources takes about a minute.
async function registerModuleEntities() {
	const files = await fg(
		['packages/cli/dist/modules/**/*.js', 'packages/modules/*/backend/dist/**/*.js'],
		{ cwd: REPO_ROOT, absolute: true },
	);
	if (files.length === 0) throw new Error('No built modules found. Build the cli package first.');

	const before = new Set(getMetadataArgsStorage().tables.map((t) => t.target));
	const nodeRequire = createRequire(__filename);
	for (const file of files) {
		if (/\.(Child)?Entity\)\(/.test(readFileSync(file, 'utf8'))) nodeRequire(file);
	}

	const registry = Container.get(ModuleRegistry);
	for (const { target } of getMetadataArgsStorage().tables) {
		if (typeof target !== 'function' || before.has(target)) continue;
		registry.entities.push(target as (typeof registry.entities)[number]);
	}
}

describe('Entity and migration schema parity', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await registerModuleEntities();
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
		await Container.get(DbConnection).migrate();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	test('every entity matches the schema that the migrations create', async () => {
		const { type: dbType, tablePrefix } = Container.get(GlobalConfig).database;
		if (dbType !== 'sqlite' && dbType !== 'postgresdb')
			throw new Error(`Unexpected ${String(dbType)}`);

		const mismatches = await findEntitySchemaMismatches(dataSource, dbType, tablePrefix);

		if (process.env.UPDATE_PARITY_BASELINE === 'true') {
			const baseline = readBaseline();
			baseline[dbType] = mismatches;
			writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, '\t')}\n`);
			return;
		}

		const known = new Set(readBaseline()[dbType]);
		const current = new Set(mismatches);
		const added = mismatches.filter((m) => !known.has(m));
		const fixed = [...known].filter((m) => !current.has(m));

		expect
			.soft(
				added,
				[
					`An entity does not match the ${dbType} schema that the migrations create.`,
					'Make the migration and the entity agree on type, nullability, foreign keys and indexes.',
					'See "Schema/Entity Drift" in .agents/skills/db-migrations/SKILL.md.',
				].join(' '),
			)
			.toEqual([]);
		expect
			.soft(
				fixed,
				`These mismatches are fixed. Remove them from ${path.relative(REPO_ROOT, BASELINE_PATH)}.`,
			)
			.toEqual([]);
	});
});
