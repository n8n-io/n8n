import { confirm, intro, log, outro } from '@clack/prompts';
import { Args, Command } from '@oclif/core';
import fs from 'node:fs/promises';
import path from 'node:path';
import picocolors from 'picocolors';

import { getPackageJson, updatePackageJson } from '../utils/package';
import { detectPackageManager } from '../utils/package-manager';
import { ensureN8nPackage, onCancel, withCancelHandler } from '../utils/prompts';

export default class CloudSupport extends Command {
	static override description = 'Enable or disable cloud support for this node';
	static override examples = [
		'<%= config.bin %> <%= command.id %>',
		'<%= config.bin %> <%= command.id %> enable',
		'<%= config.bin %> <%= command.id %> disable',
	];

	static override args = {
		action: Args.string({
			description: 'Action to perform (defaults to showing current status)',
			required: false,
			options: ['enable', 'disable'],
		}),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(CloudSupport);

		await ensureN8nPackage('cloud-support');

		const workingDir = process.cwd();

		if (args.action === 'enable') {
			await this.enableCloudSupport(workingDir);
		} else if (args.action === 'disable') {
			await this.disableCloudSupport(workingDir);
		} else {
			await this.showCloudSupportStatus(workingDir);
		}
	}

	private async enableCloudSupport(workingDir: string): Promise<void> {
		intro(picocolors.inverse(' n8n-node cloud-support enable '));

		await this.updateEslintConfig(workingDir, true);
		log.success(`Updated ${picocolors.cyan('eslint.config.mjs')} to use default config`);

		await this.updateStrictMode(workingDir, true);
		log.success(`Enabled strict mode in ${picocolors.cyan('package.json')}`);

		const packageManager = (await detectPackageManager()) ?? 'npm';
		const execCommand = packageManager === 'npm' ? 'npm run' : packageManager;
		outro(`Cloud support enabled. Run "${execCommand} lint" to check compliance.`);
	}

	private async disableCloudSupport(workingDir: string): Promise<void> {
		intro(picocolors.inverse(' n8n-node cloud-support disable '));

		log.warning(`This will make your node ineligible for n8n Cloud publication!

The following changes will be made:
  • Switch to ${picocolors.magenta('configWithoutCloudSupport')} in ${picocolors.cyan('eslint.config.mjs')}
  • Disable strict mode in ${picocolors.cyan('package.json')}`);

		const confirmed = await withCancelHandler(
			confirm({
				message: 'Are you sure you want to disable cloud support?',
				initialValue: false,
			}),
		);

		if (!confirmed) {
			onCancel('Cloud support unchanged');
			return;
		}

		// 1. Update eslint.config.mjs
		await this.updateEslintConfig(workingDir, false);
		log.success(
			`Updated ${picocolors.cyan('eslint.config.mjs')} to use ${picocolors.magenta('configWithoutCloudSupport')}`,
		);

		// 2. Disable strict mode in package.json
		await this.updateStrictMode(workingDir, false);
		log.success(`Disabled strict mode in ${picocolors.cyan('package.json')}`);

		outro(
			'Cloud support disabled. Your node can pass linting but cannot be published to n8n Cloud.',
		);
	}

	private async updateEslintConfig(workingDir: string, enableCloud: boolean): Promise<void> {
		const eslintConfigPath = path.resolve(workingDir, 'eslint.config.mjs');
		const newConfig = enableCloud
			? `import { config } from '@n8n/node-cli/eslint';

export default config;
`
			: `import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default configWithoutCloudSupport;
`;

		await fs.writeFile(eslintConfigPath, newConfig, 'utf-8');
	}

	private async updateStrictMode(workingDir: string, enableStrict: boolean): Promise<void> {
		await updatePackageJson(workingDir, (packageJson) => {
			packageJson.n8n = packageJson.n8n ?? {};
			packageJson.n8n.strict = enableStrict;
			return packageJson;
		});
	}

	private async showCloudSupportStatus(workingDir: string): Promise<void> {
		intro(picocolors.inverse(' n8n-node cloud-support '));

		try {
			const packageJson = await getPackageJson(workingDir);
			const eslintConfigPath = path.resolve(workingDir, 'eslint.config.mjs');

			// Check strict mode
			const isStrictMode = packageJson?.n8n?.strict === true;

			// Check eslint config
			let isUsingDefaultConfig = false;
			try {
				const eslintConfig = await fs.readFile(eslintConfigPath, 'utf-8');
				const normalizedConfig = eslintConfig.replace(/\s+/g, ' ').trim();
				const expectedDefault =
					"import { config } from '@n8n/node-cli/eslint'; export default config;";
				isUsingDefaultConfig = normalizedConfig === expectedDefault;
			} catch {
				// eslint config doesn't exist or can't be read
			}

			const isCloudSupported = isStrictMode && isUsingDefaultConfig;

			if (isCloudSupported) {
				log.success(`✅ Cloud support is ${picocolors.green('ENABLED')}
  • Strict mode: ${picocolors.green('enabled')}
  • ESLint config: ${picocolors.green('using default config')}
  • Status: ${picocolors.green('eligible')} for n8n Cloud publication`);
			} else {
				log.warning(`⚠️  Cloud support is ${picocolors.yellow('DISABLED')}
  • Strict mode: ${isStrictMode ? picocolors.green('enabled') : picocolors.red('disabled')}
  • ESLint config: ${isUsingDefaultConfig ? picocolors.green('using default config') : picocolors.red('using custom config')}
  • Status: ${picocolors.red('NOT eligible')} for n8n Cloud publication`);
			}

			const packageManager = (await detectPackageManager()) ?? 'npm';
			const execCommand = packageManager === 'npm' ? 'npx' : packageManager;

			log.info(`Available commands:
  • ${picocolors.cyan(`${execCommand} n8n-node cloud-support enable`)}  - Enable cloud support
  • ${picocolors.cyan(`${execCommand} n8n-node cloud-support disable`)} - Disable cloud support`);

			outro('Use the commands above to change cloud support settings');
		} catch (error) {
			log.error('Failed to read package.json or determine cloud support status');
			outro('Make sure you are in the root directory of your node package');
		}
	}
}
