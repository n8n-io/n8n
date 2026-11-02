// Builds the job matrices for test-db-reusable.yml. Node builtins only: it runs in a
// job that installs the monorepo's dependencies, not this folder's.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const POSTGRES_VERSIONS_PATH =
	'packages/quality/environments/containers/postgres-versions.json';

/** The matrix wall is bounded by its slowest leg, so a larger runner buys nothing. */
const RUNNER = 'blacksmith-4vcpu-ubuntu-2204';

// Each shard of a leg runs one suite on its own runner, so use every CPU. The CI
// default (half the CPUs) is for jobs that run many suites at once. Every test file
// gets its own database, so more workers do not share state.
const MAX_WORKERS = '--maxWorkers=100%';

/**
 * @typedef {Object} PostgresVersions
 * @property {string} primary
 * @property {Array<{ major: number, image: string, support?: string }>} matrix
 */

/** @returns {PostgresVersions} */
export function readPostgresVersions(repoRoot = REPO_ROOT) {
	const file = path.join(repoRoot, POSTGRES_VERSIONS_PATH);
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const SCOPES = new Set(['pr', 'full']);

/**
 * The schema-docs check runs on the primary Postgres leg only, since the
 * committed docs come from that one version. PRs collect coverage on that leg.
 * Merge groups use the full scope and skip duplicate coverage collection.
 *
 * Scope 'pr' keeps SQLite plus the primary Postgres leg. Scope 'full' keeps
 * every Postgres major. The merge queue generates with 'full', so every merge
 * still gates on the older majors.
 *
 * @param {PostgresVersions} versions
 * @param {'pr' | 'full'} scope
 */
export function buildMatrix(versions, scope = 'full') {
	if (!SCOPES.has(scope)) {
		throw new Error(`Unknown scope "${scope}", expected "pr" or "full"`);
	}

	const { primary, matrix } = versions;

	if (!Array.isArray(matrix) || matrix.length === 0) {
		throw new Error(`${POSTGRES_VERSIONS_PATH}: "matrix" must be a non-empty array`);
	}

	// Checked first: everything below treats the last entry as the newest.
	const majors = matrix.map((entry) => entry.major);
	for (let i = 1; i < majors.length; i++) {
		if (majors[i] <= majors[i - 1]) {
			throw new Error(
				`${POSTGRES_VERSIONS_PATH}: "matrix" must be sorted by ascending major, got ${majors.join(', ')}`,
			);
		}
	}

	const newest = matrix[matrix.length - 1];
	if (newest.image !== primary) {
		throw new Error(
			`${POSTGRES_VERSIONS_PATH}: "primary" (${primary}) must be the newest "matrix" entry's image (${newest.image})`,
		);
	}

	// An exact minor keeps CI reproducible across Postgres point releases.
	for (const { major, image } of matrix) {
		const pinned = /^postgres:(\d+)\.\d+-alpine$/.exec(image);
		if (!pinned) {
			throw new Error(
				`${POSTGRES_VERSIONS_PATH}: "${image}" must pin an exact minor, e.g. postgres:${major}.4-alpine`,
			);
		}
		if (Number(pinned[1]) !== major) {
			throw new Error(`${POSTGRES_VERSIONS_PATH}: "${image}" does not match major ${major}`);
		}
	}

	// Validation always runs on the full list; scope only trims the output.
	const postgresLegs = scope === 'pr' ? matrix.filter(({ image }) => image === primary) : matrix;

	return [
		{
			name: 'SQLite Pooled',
			runner: RUNNER,
			'test-cmd': `pnpm test:sqlite ${MAX_WORKERS}`,
			'migration-cmd': 'pnpm test:sqlite:migrations',
			'schema-check-cmd': 'pnpm --filter=@n8n/db schema:check:sqlite',
			TEST_IMAGE_POSTGRES: undefined,
			collectCoverage: 'false',
		},
		...postgresLegs.map(({ major, image }) => ({
			name: `Postgres ${major}`,
			runner: RUNNER,
			'test-cmd': `pnpm test:postgres:integration:tc ${MAX_WORKERS}`,
			'migration-cmd': `pnpm test:postgres:migrations:tc ${MAX_WORKERS}`,
			'schema-check-cmd': image === primary ? 'pnpm --filter=@n8n/db schema:check:postgres' : '',
			TEST_IMAGE_POSTGRES: image,
			collectCoverage: scope === 'pr' && image === primary ? 'true' : 'false',
		})),
	];
}

/**
 * Every leg splits its integration suite across this many runners. One runner per
 * leg takes more than 10 minutes. Vitest splits files by path hash, not by duration,
 * so the shards are not equal.
 */
export const INTEGRATION_SHARDS = 2;

const PACKAGED_MODULES_CMD = `pnpm --filter './packages/modules/*/backend' --if-present run test:postgres ${MAX_WORKERS}`;

/**
 * Expands the legs into the jobs of test-db-reusable.yml. The workflow runs each
 * entry as given, so shard and leg decisions stay in this file.
 *
 * Integration: one job per leg and shard. The packaged backend module tests and the
 * schema-docs check do not shard, so only the first shard runs them.
 * Migration: one job per leg, not sharded.
 *
 * @param {PostgresVersions} versions
 * @param {'pr' | 'full'} scope
 */
export function buildJobMatrices(versions, scope = 'full') {
	const legs = buildMatrix(versions, scope);

	const integration = legs.flatMap((leg) =>
		Array.from({ length: INTEGRATION_SHARDS }, (_, i) => {
			const shard = `${i + 1}/${INTEGRATION_SHARDS}`;
			const isFirstShard = i === 0;
			return {
				name: `${leg.name} Integration (${shard})`,
				runner: leg.runner,
				'test-cmd': `${leg['test-cmd']} --shard=${shard}`,
				'packaged-modules-cmd': isFirstShard && leg.TEST_IMAGE_POSTGRES ? PACKAGED_MODULES_CMD : '',
				'schema-check-cmd': isFirstShard ? leg['schema-check-cmd'] : '',
				TEST_IMAGE_POSTGRES: leg.TEST_IMAGE_POSTGRES,
				collectCoverage: leg.collectCoverage,
			};
		}),
	);

	const migration = legs.map((leg) => ({
		name: `${leg.name} Migrations`,
		runner: leg.runner,
		'migration-cmd': leg['migration-cmd'],
		TEST_IMAGE_POSTGRES: leg.TEST_IMAGE_POSTGRES,
	}));

	return { integration, migration };
}

// Skipped when imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const scopeArg = process.argv.find((arg) => arg.startsWith('--scope='));
	const scope = scopeArg ? scopeArg.slice('--scope='.length) : 'full';
	console.log(JSON.stringify(buildJobMatrices(readPostgresVersions(), scope)));
}
