import { intro, outro, spinner } from '@clack/prompts';
import { Command, Flags } from '@oclif/core';
import os from 'node:os';
import path from 'node:path';
import picocolors from 'picocolors';

import { createSymlink, ensureFolder } from '../../utils/filesystem';
import { detectPackageManager } from '../../utils/package-manager';
import { ensureN8nPackage, onCancel } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';
import { copyStaticFiles } from '../build';
import { clearScreen, commands, readPackageName, sleep } from './utils';

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

		const n8nUserFolder = flags['custom-user-folder'];
		const customNodesFolder = path.join(n8nUserFolder, '.n8n', 'custom');

		await ensureFolder(customNodesFolder);

		const packageName = await readPackageName();
		const invalidNodeNameError = validateNodeName(packageName);

		if (invalidNodeNameError) return onCancel(invalidNodeNameError);

		const currentDir = process.cwd();
		const symlinkPath = path.join(customNodesFolder, packageName);

		try {
			await createSymlink(currentDir, symlinkPath);
		} catch (error) {
			linkingSpinner.stop('Failed to link custom node');
			const message =
				error instanceof Error ? error.message : 'Unknown error creating symbolic link';
			return onCancel(`Failed to create symbolic link: ${message}`);
		}

		linkingSpinner.stop(
			`${picocolors.green('✓')} Your custom node ${picocolors.bold(packageName)} is now linked and will be available in n8n`,
		);

		outro(`${picocolors.dim('Starting development servers...\n')}`);

		// Wait a moment before clearing the screen so users can see the intro
		await sleep(1000);

		// Clear the screen and position cursor at top before starting persistent commands
		clearScreen();

		runPersistentCommand(packageManager, ['exec', '--', 'tsc', '--watch', '--pretty'], {
			name: 'TypeScript Build (watching)',
		});

		if (!flags['external-n8n']) {
			runPersistentCommand('npx', ['-y', '--color=always', '--prefer-online', 'n8n@latest'], {
				cwd: n8nUserFolder,
				env: {
					...process.env,
					N8N_DEV_RELOAD: 'true',
					N8N_RUNNERS_ENABLED: 'true',
					DB_SQLITE_POOL_SIZE: '10',
					N8N_USER_FOLDER: n8nUserFolder,
					FORCE_COLOR: '3',
					COLORTERM: 'truecolor',
					TERM: 'xterm-256color',
				},
				name: 'n8n Server',
			});
		}
	}
}
