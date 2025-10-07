import { cancel } from '@clack/prompts';
import fs from 'node:fs/promises';

import { CommandTester } from '../test-utils/command-tester';
import { stripAnsiCodes } from '../test-utils/matchers';
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
		await setupTestPackage(tmpdir, {
			eslintConfig: true,
		});

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], { exitCode: 0 });

		const result = await CommandTester.run('lint');

		expect(result).toBeDefined();
	});

	tmpdirTest('successful lint with warnings - shows warnings in output', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			eslintConfig: true,
		});

		const eslintWarnings = `
/tmp/project/src/index.ts
  10:5  warning  Unused variable 'unusedVar'  @typescript-eslint/no-unused-vars
  15:3  warning  Missing return type         @typescript-eslint/explicit-function-return-type

✖ 2 problems (0 errors, 2 warnings)
`;

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], {
			exitCode: 0,
			stdout: eslintWarnings,
		});

		const result = await CommandTester.run('lint');

		expect(result).toBeDefined();

		const stdoutCalls = mockProcessStdout.mock.calls.flat();
		const allOutput = stripAnsiCodes(
			stdoutCalls.map((call) => (Buffer.isBuffer(call) ? call.toString() : String(call))).join(''),
		);

		expect(allOutput).toContain('Unused variable');
	});

	tmpdirTest('lint with fix flag - passes --fix to eslint', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			eslintConfig: true,
		});

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.', '--fix'], { exitCode: 0 });

		const result = await CommandTester.run('lint --fix');

		expect(result).toBeDefined();
	});

	tmpdirTest('eslint failure - exits with error code', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			eslintConfig: true,
		});

		mockSpawn('pnpm', ['exec', '--', 'eslint', '.'], {
			exitCode: 1,
			stderr: 'ESLint found 3 errors',
		});

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');
	});

	tmpdirTest('eslint spawn error - handles process errors', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			eslintConfig: true,
		});

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
		await setupTestPackage(tmpdir, {
			eslintConfig: true,
		});

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
		await setupTestPackage(tmpdir, {
			eslintConfig: true,
		});

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

		await fs.writeFile(`${tmpdir}/pnpm-lock.yaml`, 'lockfileVersion: 5.4\n');

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

		await fs.writeFile(`${tmpdir}/pnpm-lock.yaml`, 'lockfileVersion: 5.4\n');

		// Don't create eslint.config.mjs file (it will be missing)

		await expect(CommandTester.run('lint')).rejects.toThrow('EEXIT: 1');

		const stdoutCalls = mockProcessStdout.mock.calls.flat();
		const stdout = stdoutCalls
			.filter((call) => typeof call === 'string')
			.map(stripAnsiCodes)
			.join('\n');
		expect(stdout).toContain('eslint.config.mjs not found');
	});
});
