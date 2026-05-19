import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { getEnvSearchDirectories, loadDevelopmentEnvFiles } = require('../../bin/load-development-env');

describe('loadDevelopmentEnvFiles', () => {
	let tempDir: string;
	let repoRoot: string;
	let cliBinDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-env-'));
		repoRoot = path.join(tempDir, 'repo');
		cliBinDir = path.join(repoRoot, 'packages', 'cli', 'bin');
		fs.mkdirSync(cliBinDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
		delete process.env.N8N_TEST_ENV_LOADER;
	});

	test('searches cwd and monorepo root derived from the CLI bin directory', () => {
		const directories = getEnvSearchDirectories(cliBinDir);

		expect(directories).toEqual(
			expect.arrayContaining([path.resolve(process.cwd()), path.resolve(repoRoot)]),
		);
	});

	test('loads env files from the monorepo root when cwd is packages/cli/bin', () => {
		fs.writeFileSync(
			path.join(repoRoot, '.env'),
			'N8N_TEST_ENV_LOADER=from-root-env\n',
			'utf8',
		);
		fs.writeFileSync(
			path.join(repoRoot, '.env.local'),
			'N8N_TEST_ENV_LOADER=from-root-local\n',
			'utf8',
		);

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
