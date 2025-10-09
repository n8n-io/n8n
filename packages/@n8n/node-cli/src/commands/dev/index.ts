import { intro, log, outro, spinner } from '@clack/prompts';
import { Command, Flags } from '@oclif/core';
import os from 'node:os';
import path from 'node:path';
import picocolors from 'picocolors';
import { rimraf } from 'rimraf';

import { ensureFolder } from '../../utils/filesystem';
import { detectPackageManager } from '../../utils/package-manager';
import { ensureN8nPackage, onCancel } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';
import { copyStaticFiles } from '../build';
import { commands, readPackageName } from './utils';
import { runCommand } from '../../utils/child-process';

export default class Dev extends Command {
	static override description = 'Run n8n with the node and rebuild on changes for live preview';
	static override examples = [
		'<%= config.bin %> <%= command.id %>',
		'<%= config.bin %> <%= command.id %> --external-n8n',
		'<%= config.bin %> <%= command.id %> --custom-user-folder /Users/test',
	];
	static override flags = {
		'external-n8n': Flags.boolean({
			default: false,
			description:
				'By default n8n-node dev will run n8n in a sub process. Enable this option if you would like to run n8n elsewhere. Make sure to set N8N_DEV_RELOAD to true in that case.',
		}),
		'custom-user-folder': Flags.directory({
			default: path.join(os.homedir(), '.n8n-node-cli'),
			description:
				'Folder to use to store user-specific n8n data. By default it will use ~/.n8n-node-cli. The node CLI will install your node here.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);

		const packageManager = (await detectPackageManager()) ?? 'npm';
		const { runPersistentCommand } = commands();

		intro(picocolors.inverse(' n8n-node dev '));

		await ensureN8nPackage('n8n-node dev');

		await copyStaticFiles();

		const linkingSpinner = spinner();
		linkingSpinner.start('Linking custom node to n8n');
		await runCommand(packageManager, ['link']);

		const n8nUserFolder = flags['custom-user-folder'];
		const customNodesFolder = path.join(n8nUserFolder, '.n8n', 'custom');

		await ensureFolder(customNodesFolder);

		const packageName = await readPackageName();
		const invalidNodeNameError = validateNodeName(packageName);

		if (invalidNodeNameError) return onCancel(invalidNodeNameError);

		// Remove existing package.json to avoid conflicts
		await rimraf(path.join(customNodesFolder, 'package.json'));
		await runCommand(packageManager, ['link', packageName], {
			cwd: customNodesFolder,
		});

		linkingSpinner.stop('Linked custom node to n8n');

		if (!flags['external-n8n']) {
			let setupComplete = false;
			const npxN8nSpinner = spinner();
			npxN8nSpinner.start('Starting n8n dev server');
			log.warn(picocolors.dim('First run may take a few minutes while dependencies are installed'));

			// Run n8n with hot reload enabled, always attempt to use latest n8n
			try {
				await Promise.race([
					new Promise<void>((resolve) => {
						runPersistentCommand('npx', ['-y', '--quiet', '--prefer-online', 'n8n@latest'], {
							cwd: n8nUserFolder,
							env: {
								...process.env,
								N8N_DEV_RELOAD: 'true',
								N8N_RUNNERS_ENABLED: 'true',
								DB_SQLITE_POOL_SIZE: '10',
								N8N_USER_FOLDER: n8nUserFolder,
							},
							name: 'n8n',
							color: picocolors.green,
							allowOutput: (line) => {
								if (line.includes('Initializing n8n process')) {
									resolve();
								}

								return setupComplete;
							},
						});
					}),
					new Promise<void>((_, reject) => {
						setTimeout(() => {
							const error = new Error('n8n startup timeout after 120 seconds');
							reject(error);
						}, 120_000);
					}),
				]);

				setupComplete = true;
				npxN8nSpinner.stop('Started n8n dev server');
			} catch (error) {
				npxN8nSpinner.stop('Failed to start n8n dev server');
				onCancel(error instanceof Error ? error.message : 'Unknown error occurred', 1);
				return;
			}
		}

		outro('✓ Setup complete');

		// Run `tsc --watch` in background
		runPersistentCommand(packageManager, ['exec', '--', 'tsc', '--watch'], {
			name: 'build',
			color: picocolors.cyan,
		});
	}
}
