import { Command, Flags } from '@oclif/core';
import os from 'node:os';
import path from 'node:path';
import picocolors from 'picocolors';

import { ensureFolder } from '../../utils/filesystem';
import { detectPackageManager } from '../../utils/package-manager';
import { copyStaticFiles } from '../build';
import { commands, readPackageName } from './utils';
import { ensureN8nPackage, onCancel } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';

export default class Dev extends Command {
	static override description = 'Run n8n with the node and rebuild on changes for live preview';
	static override examples = [
		'<%= config.bin %> <%= command.id %>',
		'<%= config.bin %> <%= command.id %> --external-n8n',
		'<%= config.bin %> <%= command.id %> --custom-nodes-dir /opt/n8n-extensions',
	];
	static override flags = {
		'external-n8n': Flags.boolean({
			default: false,
			description:
				'By default n8n-node dev will run n8n in a sub process. Enable this option if you would like to run n8n elsewhere.',
		}),
		'custom-nodes-dir': Flags.directory({
			default: path.join(os.homedir(), '.n8n/custom'),
			description:
				'Where to link your custom node. By default it will link to ~/.n8n/custom. You probably want to enable this option if you run n8n with a custom N8N_CUSTOM_EXTENSIONS env variable.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);

		const packageManager = detectPackageManager() ?? 'npm';
		const { isN8nInstalled, runCommand, runPersistentCommand } = commands();

		await ensureN8nPackage('n8n-node dev');

		const installed = await isN8nInstalled();
		if (!installed && !flags['external-n8n']) {
			console.error(
				'❌ n8n is not installed or not in PATH. Learn how to install n8n here: https://docs.n8n.io/hosting/installation/npm',
			);
			process.exit(1);
		}

		await copyStaticFiles();

		await runCommand(packageManager, ['link']);

		const customPath = flags['custom-nodes-dir'];

		await ensureFolder(customPath);

		const packageName = await readPackageName();
		const invalidNodeNameError = validateNodeName(packageName);

		if (invalidNodeNameError) return onCancel(invalidNodeNameError);

		await runCommand(packageManager, ['link', packageName], { cwd: customPath });

		if (!flags['external-n8n']) {
			// Run n8n with hot reload enabled
			runPersistentCommand('n8n', [], {
				cwd: customPath,
				env: { N8N_DEV_RELOAD: 'true' },
				name: 'n8n',
				color: picocolors.green,
			});
		}

		// Run `tsc --watch` in background
		runPersistentCommand('tsc', ['--watch'], {
			name: 'build',
			color: picocolors.cyan,
		});
	}
}
