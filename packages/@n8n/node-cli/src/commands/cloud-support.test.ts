import { CommandTester } from '../test-utils/command-tester';
import { MockPrompt } from '../test-utils/mock-prompts';
import { setupTestPackage } from '../test-utils/package-setup';
import { tmpdirTest } from '../test-utils/temp-fs';

describe('cloud-support command', () => {
	beforeEach(() => {
		MockPrompt.reset();
	});

	describe('enable', () => {
		tmpdirTest('writes correct eslint config and updates package.json', async ({ tmpdir }) => {
			await setupTestPackage(tmpdir, {
				eslintConfig: "import { config } from '@n8n/node-cli/eslint'; export default config;",
			});

			await CommandTester.run('cloud-support enable');

			await expect(tmpdir).toHaveFileEqual(
				'eslint.config.mjs',
				"import { config } from '@n8n/node-cli/eslint';\n\nexport default config;\n",
			);
			await expect(tmpdir).toHaveFileContaining('package.json', '"strict": true');
		});
	});

	describe('status', () => {
		tmpdirTest('shows enabled status when strict mode and default config', async ({ tmpdir }) => {
			await setupTestPackage(tmpdir, {
				packageJson: { n8n: { strict: true } },
				eslintConfig: true,
			});

			const result = await CommandTester.run('cloud-support');

			expect(result).toHaveLoggedSuccess('ENABLED');
		});

		tmpdirTest('shows disabled status when not strict mode', async ({ tmpdir }) => {
			await setupTestPackage(tmpdir, {
				packageJson: { n8n: { strict: false } },
				eslintConfig: true,
			});

			const result = await CommandTester.run('cloud-support');

			expect(result).toHaveLoggedWarning('DISABLED');
		});
	});

	describe('disable', () => {
		tmpdirTest('updates config when user confirms', async ({ tmpdir }) => {
			await setupTestPackage(tmpdir, {
				packageJson: { n8n: { strict: true } },
				eslintConfig: true,
			});

			MockPrompt.setup([
				{
					question: 'Are you sure you want to disable cloud support?',
					answer: true,
				},
			]);

			const result = await CommandTester.run('cloud-support disable');

			await expect(tmpdir).toHaveFileEqual(
				'eslint.config.mjs',
				"import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';\n\nexport default configWithoutCloudSupport;\n",
			);

			await expect(tmpdir).toHaveFileContaining('package.json', '"strict": false');

			expect(result).toHaveLoggedSuccess(
				'Updated eslint.config.mjs to use configWithoutCloudSupport',
			);
			expect(result).toHaveLoggedSuccess('Disabled strict mode in package.json');
		});

		tmpdirTest('does not update config when user cancels', async ({ tmpdir }) => {
			await setupTestPackage(tmpdir, {
				packageJson: { n8n: { strict: true } },
				eslintConfig: true,
			});

			MockPrompt.setup([
				{
					question: 'Are you sure you want to disable cloud support?',
					answer: 'CANCEL',
				},
			]);

			await expect(CommandTester.run('cloud-support disable')).rejects.toThrow('EEXIT: 0');

			await expect(tmpdir).toHaveFileEqual(
				'eslint.config.mjs',
				"import { config } from '@n8n/node-cli/eslint';\n\nexport default config;\n",
			);
			await expect(tmpdir).toHaveFileContaining('package.json', '"strict": true');
		});

		tmpdirTest('does not update config when user declines', async ({ tmpdir }) => {
			await setupTestPackage(tmpdir, {
				packageJson: { n8n: { strict: true } },
				eslintConfig: true,
			});

			MockPrompt.setup([
				{
					question: 'Are you sure you want to disable cloud support?',
					answer: false,
				},
			]);

			await expect(CommandTester.run('cloud-support disable')).rejects.toThrow('EEXIT: 0');

			await expect(tmpdir).toHaveFileEqual(
				'eslint.config.mjs',
				"import { config } from '@n8n/node-cli/eslint';\n\nexport default config;\n",
			);
			await expect(tmpdir).toHaveFileContaining('package.json', '"strict": true');
		});
	});
});
