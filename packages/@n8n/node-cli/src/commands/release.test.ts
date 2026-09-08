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
		'--hooks.before:init="pnpm run lint && pnpm run build"',
		'--hooks.after:bump="npx auto-changelog -p"',
	];

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.npm_config_user_agent;
		delete process.env.GITHUB_ACTIONS;
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

		mockSpawn('pnpm', [...releaseItArgs, '--npm.publish=false'], { exitCode: 0 });

		const result = await CommandTester.run('release');

		expect(result).toBeDefined();
	});

	tmpdirTest('--publish flag - runs release-it with npm publish', async ({ tmpdir }) => {
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

		mockSpawn('pnpm', releaseItArgs, { exitCode: 0 });

		const result = await CommandTester.run('release --publish');

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

	tmpdirTest('CI mode - runs lint, build, then npm publish with provenance', async ({ tmpdir }) => {
		process.env.GITHUB_ACTIONS = 'true';

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

		mockSpawn([
			{ command: 'pnpm', args: ['run', 'lint'], options: { exitCode: 0 } },
			{ command: 'pnpm', args: ['run', 'build'], options: { exitCode: 0 } },
			{ command: 'npm', args: ['publish'], options: { exitCode: 0 } },
		]);

		const result = await CommandTester.run('release');

		expect(result).toBeDefined();
	});

	tmpdirTest('local release without publish.yml - shows init-workflow hint', async ({ tmpdir }) => {
		await fs.writeFile(`${tmpdir}/pnpm-lock.yaml`, '# pnpm lock file');

		mockSpawn('pnpm', [...releaseItArgs, '--npm.publish=false'], { exitCode: 0 });

		const result = await CommandTester.run('release');

		expect(result.getLogMessages('info')).toEqual(
			expect.arrayContaining([expect.stringContaining('--init-workflow')]),
		);
	});

	tmpdirTest(
		'--init-workflow - creates publish.yml with package manager rendered',
		async ({ tmpdir }) => {
			await fs.writeFile(`${tmpdir}/pnpm-lock.yaml`, '# pnpm lock file');

			const result = await CommandTester.run('release --init-workflow');

			const workflowPath = `${tmpdir}/.github/workflows/publish.yml`;
			const content = await fs.readFile(workflowPath, 'utf-8');

			expect(content).toContain('pnpm install');
			expect(content).toContain('pnpm run release');
			expect(content).not.toContain('{{packageManager');
			expect(result.getLogMessages('success')).toEqual(
				expect.arrayContaining([expect.stringContaining('publish.yml')]),
			);
		},
	);

	tmpdirTest('--init-workflow - skips if publish.yml already exists', async ({ tmpdir }) => {
		await fs.mkdir(`${tmpdir}/.github/workflows`, { recursive: true });
		const workflowPath = `${tmpdir}/.github/workflows/publish.yml`;
		const originalContent = '# existing workflow';
		await fs.writeFile(workflowPath, originalContent);

		const result = await CommandTester.run('release --init-workflow');

		const content = await fs.readFile(workflowPath, 'utf-8');
		expect(content).toBe(originalContent);
		expect(result.getLogMessages('warning')).toEqual(
			expect.arrayContaining([expect.stringContaining('already exists')]),
		);
	});

	tmpdirTest('CI mode - exits with error code on lint failure', async ({ tmpdir }) => {
		process.env.GITHUB_ACTIONS = 'true';

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

		mockSpawn([{ command: 'pnpm', args: ['run', 'lint'], options: { exitCode: 1 } }]);

		await expect(CommandTester.run('release')).rejects.toThrow('EEXIT: 1');
	});
});
