import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildMatrix, readPostgresVersions, POSTGRES_VERSIONS_PATH } from './db-test-matrix.mjs';

// node --test ./.github/scripts/db-test-matrix.test.mjs

const versions = () => ({
	primary: 'postgres:18.4-alpine',
	matrix: [
		{ major: 16, support: 'compatibility', image: 'postgres:16.14-alpine' },
		{ major: 17, support: 'supported', image: 'postgres:17.10-alpine' },
		{ major: 18, support: 'supported', image: 'postgres:18.4-alpine' },
	],
});

describe('postgres-versions.json', () => {
	it('is valid, so the DB workflow can build a matrix from it', () => {
		assert.doesNotThrow(() => buildMatrix(readPostgresVersions()));
	});

	it('covers the supported range plus one compatibility major', () => {
		const { matrix } = readPostgresVersions();

		const supported = matrix.filter((entry) => entry.support === 'supported');
		const compatibility = matrix.filter((entry) => entry.support === 'compatibility');

		assert.equal(supported.length, 2, `${POSTGRES_VERSIONS_PATH}: expected two supported majors`);
		assert.equal(
			compatibility.length,
			1,
			`${POSTGRES_VERSIONS_PATH}: expected one compatibility major`,
		);
		assert.ok(compatibility[0].major < Math.min(...supported.map((entry) => entry.major)));
	});
});

describe('buildMatrix', () => {
	it('emits one leg per database', () => {
		const legs = buildMatrix(versions());

		assert.deepEqual(
			legs.map((leg) => leg.name),
			['SQLite Pooled', 'Postgres 16', 'Postgres 17', 'Postgres 18'],
		);
	});

	it('passes each Postgres leg its own pinned image', () => {
		const legs = buildMatrix(versions());

		assert.deepEqual(
			legs.filter((leg) => leg.TEST_IMAGE_POSTGRES).map((leg) => leg.TEST_IMAGE_POSTGRES),
			['postgres:16.14-alpine', 'postgres:17.10-alpine', 'postgres:18.4-alpine'],
		);
		assert.equal(legs[0].TEST_IMAGE_POSTGRES, undefined, 'SQLite leg needs no Postgres image');
	});

	it('runs every leg against both the integration and the migration suite', () => {
		for (const leg of buildMatrix(versions())) {
			assert.ok(leg['test-cmd'], `${leg.name} has no test command`);
			assert.ok(leg['migration-cmd'], `${leg.name} has no migration command`);
		}
	});

	it('collects coverage and checks schema docs on the primary Postgres leg only', () => {
		const legs = buildMatrix(versions());

		const collecting = legs.filter((leg) => leg.collectCoverage === 'true');
		assert.deepEqual(
			collecting.map((leg) => leg.name),
			['Postgres 18'],
		);

		const checkingPostgresSchema = legs.filter(
			(leg) => leg['schema-check-cmd'] === 'pnpm --filter=@n8n/db schema:check:postgres',
		);
		assert.deepEqual(
			checkingPostgresSchema.map((leg) => leg.name),
			['Postgres 18'],
		);
		const skipping = legs.filter((leg) => leg['schema-check-cmd'] === '');
		assert.deepEqual(
			skipping.map((leg) => leg.name),
			['Postgres 16', 'Postgres 17'],
		);
	});

	it('still checks the SQLite schema docs', () => {
		const legs = buildMatrix(versions());

		assert.equal(legs[0]['schema-check-cmd'], 'pnpm --filter=@n8n/db schema:check:sqlite');
	});

	it('rejects a primary that is not the newest major', () => {
		const stale = { ...versions(), primary: 'postgres:17.10-alpine' };

		assert.throws(() => buildMatrix(stale), /"primary".*must be the newest/);
	});

	it('rejects majors that are not in ascending order', () => {
		const unsorted = versions();
		[unsorted.matrix[0], unsorted.matrix[1]] = [unsorted.matrix[1], unsorted.matrix[0]];

		assert.throws(() => buildMatrix(unsorted), /ascending major, got 17, 16, 18/);
	});

	it('rejects a floating image tag', () => {
		const floating = {
			primary: 'postgres:18-alpine',
			matrix: [{ major: 18, image: 'postgres:18-alpine' }],
		};

		assert.throws(() => buildMatrix(floating), /must pin an exact minor/);
	});

	it('rejects an image whose major disagrees with its entry', () => {
		const mismatched = {
			primary: 'postgres:17.10-alpine',
			matrix: [{ major: 18, image: 'postgres:17.10-alpine' }],
		};

		assert.throws(() => buildMatrix(mismatched), /does not match major 18/);
	});

	it('rejects an empty matrix', () => {
		assert.throws(() => buildMatrix({ primary: 'postgres:18.4-alpine', matrix: [] }), /non-empty/);
	});

	it('keeps only SQLite and the primary Postgres leg in pr scope', () => {
		const legs = buildMatrix(versions(), 'pr');

		assert.deepEqual(
			legs.map((leg) => leg.name),
			['SQLite Pooled', 'Postgres 18'],
		);
	});

	it('keeps every Postgres leg in full scope', () => {
		const legs = buildMatrix(versions(), 'full');

		assert.deepEqual(
			legs.map((leg) => leg.name),
			['SQLite Pooled', 'Postgres 16', 'Postgres 17', 'Postgres 18'],
		);
	});

	it('validates the full version list even in pr scope', () => {
		const stale = { ...versions(), primary: 'postgres:17.10-alpine' };

		assert.throws(() => buildMatrix(stale, 'pr'), /"primary".*must be the newest/);
	});

	it('rejects an unknown scope', () => {
		assert.throws(() => buildMatrix(versions(), 'nightly'), /Unknown scope/);
	});
});
