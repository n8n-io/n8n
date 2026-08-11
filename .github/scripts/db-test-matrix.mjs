// Builds the job matrix for test-db-reusable.yml. Node builtins only: it runs in a
// job that installs the monorepo's dependencies, not this folder's.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const POSTGRES_VERSIONS_PATH = 'packages/testing/containers/postgres-versions.json';

/** The matrix wall is bounded by its slowest leg, so a larger runner buys nothing. */
const RUNNER = 'blacksmith-4vcpu-ubuntu-2204';

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

/**
 * Coverage and the schema-docs check run on the primary Postgres leg only, since
 * the committed docs come from that one version.
 *
 * @param {PostgresVersions} versions
 */
export function buildMatrix(versions) {
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

	return [
		{
			name: 'SQLite Pooled',
			runner: RUNNER,
			'test-cmd': 'pnpm test:sqlite',
			'migration-cmd': 'pnpm test:sqlite:migrations',
			'schema-check-cmd': 'pnpm --filter=@n8n/db schema:check:sqlite',
			TEST_IMAGE_POSTGRES: undefined,
			collectCoverage: 'false',
		},
		...matrix.map(({ major, image }) => ({
			name: `Postgres ${major}`,
			runner: RUNNER,
			'test-cmd': 'pnpm test:postgres:integration:tc',
			'migration-cmd': 'pnpm test:postgres:migrations:tc',
			'schema-check-cmd': image === primary ? 'pnpm --filter=@n8n/db schema:check:postgres' : '',
			TEST_IMAGE_POSTGRES: image,
			collectCoverage: image === primary ? 'true' : 'false',
		})),
	];
}

// Skipped when imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	console.log(JSON.stringify(buildMatrix(readPostgresVersions())));
}
