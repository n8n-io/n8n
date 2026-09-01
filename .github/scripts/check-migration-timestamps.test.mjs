import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	MIGRATIONS_DIR,
	findOutOfOrderMigrations,
	parseMigrationPath,
} from './check-migration-timestamps.mjs';

// node --test ./.github/scripts/check-migration-timestamps.test.mjs

const file = (folder, fileBase) => `${MIGRATIONS_DIR}/${folder}/${fileBase}.ts`;

const baseFiles = [
	file('common', '1700000000000-CreateFoo'),
	file('sqlite', '1750000000000-AddBar'),
	file('postgresdb', '1780000000000-AddBaz'),
];

describe('parseMigrationPath', () => {
	it('parses a migration file path', () => {
		assert.deepEqual(parseMigrationPath(file('common', '1700000000000-CreateFoo')), {
			path: file('common', '1700000000000-CreateFoo'),
			fileBase: '1700000000000-CreateFoo',
			timestamp: 1700000000000,
		});
	});

	it('ignores non-migration files', () => {
		assert.equal(parseMigrationPath(`${MIGRATIONS_DIR}/migration-helpers.ts`), null);
		assert.equal(parseMigrationPath(`${MIGRATIONS_DIR}/common/index.ts`), null);
		assert.equal(parseMigrationPath(`${MIGRATIONS_DIR}/dsl/1700000000000-Fake.ts`), null);
		assert.equal(parseMigrationPath('packages/cli/test/migration/1700000000000-foo.test.ts'), null);
	});
});

describe('findOutOfOrderMigrations', () => {
	it('flags an added migration older than the newest base migration', () => {
		const violations = findOutOfOrderMigrations(baseFiles, [
			file('common', '1760000000000-TooOld'),
		]);

		assert.equal(violations.length, 1);
		assert.equal(violations[0].fileBase, '1760000000000-TooOld');
		assert.equal(violations[0].newestBase.fileBase, '1780000000000-AddBaz');
	});

	it('flags an added migration that re-uses the newest base timestamp', () => {
		const violations = findOutOfOrderMigrations(baseFiles, [
			file('sqlite', '1780000000000-Different'),
		]);

		assert.equal(violations.length, 1);
	});

	it('passes migrations newer than everything on the base branch', () => {
		const violations = findOutOfOrderMigrations(baseFiles, [
			file('common', '1790000000000-NewOne'),
			file('postgresdb', '1790000000001-NewTwo'),
		]);

		assert.deepEqual(violations, []);
	});

	it('flags only the out-of-order files in a mixed set', () => {
		const violations = findOutOfOrderMigrations(baseFiles, [
			file('common', '1760000000000-TooOld'),
			file('common', '1790000000000-FineOne'),
		]);

		assert.deepEqual(
			violations.map(({ fileBase }) => fileBase),
			['1760000000000-TooOld'],
		);
	});

	it('allows a per-DB variant that shadows an existing migration', () => {
		const violations = findOutOfOrderMigrations(baseFiles, [
			file('postgresdb', '1700000000000-CreateFoo'),
		]);

		assert.deepEqual(violations, []);
	});

	it('ignores added files that are not migrations', () => {
		const violations = findOutOfOrderMigrations(baseFiles, [
			`${MIGRATIONS_DIR}/__tests__/1700000000000-CreateFoo.test.ts`,
			`${MIGRATIONS_DIR}/migration-types.ts`,
		]);

		assert.deepEqual(violations, []);
	});

	it('passes when the base branch has no migrations', () => {
		const violations = findOutOfOrderMigrations([], [file('common', '1700000000000-CreateFoo')]);

		assert.deepEqual(violations, []);
	});
});
