jest.unmock('node:fs');

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const {
	getEnvSearchDirectories,
	loadDevelopmentEnvFiles,
} = require('../../bin/load-development-env');

describe('loadDevelopmentEnvFiles', () => {
	let tempDir: string;
	let repoRoot: string;
	let cliBinDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'n8n-env-'));
		repoRoot = join(tempDir, 'repo');
		cliBinDir = join(repoRoot, 'packages', 'cli', 'bin');
		mkdirSync(cliBinDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
		delete process.env.N8N_TEST_ENV_LOADER;
	});

	test('searches cwd and monorepo root derived from the CLI bin directory', () => {
		const directories = getEnvSearchDirectories(cliBinDir);

		expect(directories).toEqual(
			expect.arrayContaining([resolve(process.cwd()), resolve(repoRoot)]),
		);
	});

	test('loads env files from the monorepo root when cwd is packages/cli/bin', () => {
		writeFileSync(join(repoRoot, '.env'), 'N8N_TEST_ENV_LOADER=from-root-env\n', 'utf8');
		writeFileSync(join(repoRoot, '.env.local'), 'N8N_TEST_ENV_LOADER=from-root-local\n', 'utf8');

		const previousCwd = process.cwd();
		process.chdir(cliBinDir);

		try {
			loadDevelopmentEnvFiles({ cliBinDir });
			expect(process.env.N8N_TEST_ENV_LOADER).toBe('from-root-local');
		} finally {
			process.chdir(previousCwd);
		}
	});
});
