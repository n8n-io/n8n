import fs from 'node:fs/promises';

import { CommandTester } from '../test-utils/command-tester';
import { mockSpawn } from '../test-utils/mock-child-process';
import { tmpdirTest } from '../test-utils/temp-fs';

describe('release command', () => {
	const originalEnv = process.env;

	const releaseItArgs = [
		'exec',
		'--',
		'release-it',
		'-n',
		'--git.requireBranch main',
		'--git.requireCleanWorkingDir',
		'--git.requireUpstream',
		'--git.requireCommits',
		'--git.commit',
		'--git.tag',
		'--git.push',
		'--git.changelog="npx auto-changelog --stdout --unreleased --commit-limit false -u --hide-credit"',
		'--github.release',
	];

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.npm_config_user_agent;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	tmpdirTest('successful release - runs release-it with correct arguments', async ({ tmpdir }) => {
		await fs.writeFile(
			`${tmpdir}/package.json`,
			JSON.stringify({
				name: 'test-node',
				version: '1.0.0',
				n8n: {
					nodes: ['dist/nodes/TestNode.node.js'],
				},
			}),
		);
		await fs.writeFile(`${tmpdir}/pnpm-lock.yaml`, '# pnpm lock file');

		mockSpawn(
			'pnpm',
			[
				...releaseItArgs,
				'--hooks.before:init="pnpm run lint && pnpm run build"',
				'--hooks.after:bump="npx auto-changelog -p"',
			],
			{ exitCode: 0 },
		);

		const result = await CommandTester.run('release');

		expect(result).toBeDefined();
	});

	tmpdirTest('release-it failure - exits with error code', async ({ tmpdir }) => {
		await fs.writeFile(
			`${tmpdir}/package.json`,
			JSON.stringify({
				name: 'test-node',
				version: '1.0.0',
				n8n: {
					nodes: ['dist/nodes/TestNode.node.js'],
				},
			}),
		);

		mockSpawn('npm', expect.any(Array) as string[], {
			exitCode: 1,
			stderr: 'Release failed: Git working directory is not clean',
		});

		await expect(CommandTester.run('release')).rejects.toThrow('EEXIT: 1');
	});
});
