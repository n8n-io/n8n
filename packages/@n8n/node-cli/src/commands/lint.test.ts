import { cancel } from '@clack/prompts';
import fs from 'node:fs/promises';

import { CommandTester } from '../test-utils/command-tester';
import { mockSpawn } from '../test-utils/mock-child-process';
import { setupTestPackage } from '../test-utils/package-setup';
import { tmpdirTest } from '../test-utils/temp-fs';

describe('lint command', () => {
	const mockProcessStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
	vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	tmpdirTest('successful lint - runs eslint with correct arguments', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], { exitCode: 0 });

		const result = await CommandTester.run('lint');

		expect(result).toBeDefined();
	});

	tmpdirTest('lint with fix flag - passes --fix to eslint', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.', '--fix'], { exitCode: 0 });

		const result = await CommandTester.run('lint --fix');

		expect(result).toBeDefined();
	});

	tmpdirTest('eslint failure - exits with error code', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], {
			exitCode: 1,
			stderr: 'ESLint found 3 errors',
		});

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');
	});

	tmpdirTest('eslint spawn error - handles process errors', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], {
			error: 'ENOENT: no such file or directory, spawn eslint',
		});

		await expect(CommandTester.run('lint')).rejects.toThrow();
	});

	tmpdirTest('invalid package - not an n8n node package', async ({ tmpdir }) => {
		await fs.writeFile(
			`${tmpdir}/package.json`,
			JSON.stringify({
				name: 'regular-package',
				version: '1.0.0',
				// No n8n field - this makes it an invalid n8n package
			}),
		);

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');

		expect(cancel).toHaveBeenCalledWith('lint can only be run in an n8n node package');
	});

	tmpdirTest('strict mode with default config - passes validation', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { n8n: { strict: true } },
			eslintConfig: true,
		});

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], { exitCode: 0 });

		const result = await CommandTester.run('lint');

		expect(result).toBeDefined();
	});

	tmpdirTest('cloud-only lint errors - suggests disabling cloud support', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], {
			exitCode: 1,
			stderr: 'Error: @n8n/eslint-plugin-community-nodes/no-restricted-globals rule failed',
		});

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');

		const stdoutCalls = mockProcessStdout.mock.calls.flat();
		const hasCloudMessage = stdoutCalls.some(
			(call) =>
				typeof call === 'string' && call.includes('n8n Cloud compatibility issues detected'),
		);
		expect(hasCloudMessage).toBe(true);
	});

	tmpdirTest('regular lint errors - no cloud suggestion', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], {
			exitCode: 1,
			stderr: 'Error: Unexpected token',
		});

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');

		const stdoutCalls = mockProcessStdout.mock.calls.flat();
		const hasCloudMessage = stdoutCalls.some(
			(call) => typeof call === 'string' && call.includes('n8n Cloud compatibility'),
		);
		expect(hasCloudMessage).toBe(false);
	});

	tmpdirTest('strict mode with modified config - fails validation', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { n8n: { strict: true } },
			eslintConfig:
				"import { config } from '@n8n/node-cli/eslint';\n\n// Custom modification\nexport default config;\n",
		});

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');

		const stdoutCalls = mockProcessStdout.mock.calls.flat();
		const hasStrictModeError = stdoutCalls.some(
			(call) => typeof call === 'string' && call.includes('Strict mode violation:'),
		);
		expect(hasStrictModeError).toBe(true);
	});

	tmpdirTest('strict mode with missing config - fails validation', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { n8n: { strict: true } },
		});

		// Don't create eslint.config.mjs file (it will be missing)

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');

		const stdoutCalls = mockProcessStdout.mock.calls.flat();
		const hasMissingConfigError = stdoutCalls.some(
			(call) => typeof call === 'string' && call.includes('eslint.config.mjs not found'),
		);
		expect(hasMissingConfigError).toBe(true);
	});
});
