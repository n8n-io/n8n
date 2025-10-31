import { Command, Flags } from '@oclif/core';
import os from 'node:os';
import path from 'node:path';
import picocolors from 'picocolors';

import { createSymlink, ensureFolder } from '../../utils/filesystem';
import { detectPackageManager } from '../../utils/package-manager';
import { getCommandHeader, onCancel } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';
import { copyStaticFiles } from '../build';
import {
	buildHelpText,
	type CommandConfig,
	createOpenN8nHandler,
	createSpinner,
	readPackageName,
	runCommands,
} from './utils';

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

		await copyStaticFiles();

		const n8nUserFolder = flags['custom-user-folder'];
		const customNodesFolder = path.join(n8nUserFolder, '.n8n', 'custom');
		const nodeModulesFolder = path.join(customNodesFolder, 'node_modules');

		await ensureFolder(nodeModulesFolder);

		const packageName = await readPackageName();
		const invalidNodeNameError = validateNodeName(packageName);

		if (invalidNodeNameError) return onCancel(invalidNodeNameError);

		const currentDir = process.cwd();
		const symlinkPath = path.join(nodeModulesFolder, packageName);

		try {
			await createSymlink(currentDir, symlinkPath);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error creating symbolic link';
			return onCancel(`Failed to create symbolic link: ${message}`);
		}

		let n8nReady = false;
		const hasN8n = !flags['external-n8n'];

		let spinnerMessage = 'Starting n8n...';
		setTimeout(() => {
			spinnerMessage = `Installing n8n... ${picocolors.dim('(this can take a while on first run)')}`;
		}, 10_000);

		const n8nSpinner = createSpinner(() => spinnerMessage);

		const commandsList: CommandConfig[] = [
			{
				cmd: packageManager,
				args: ['exec', '--', 'tsc', '--watch', '--pretty'],
				name: 'TypeScript Build (watching)',
			},
		];

		if (hasN8n) {
			commandsList.push({
				cmd: 'npx',
				args: ['-y', '--color=always', '--prefer-online', 'n8n@latest'],
				name: 'n8n Server',
				cwd: n8nUserFolder,
				env: {
					...process.env,
					N8N_DEV_RELOAD: 'true',
					N8N_RUNNERS_ENABLED: 'true',
					DB_SQLITE_POOL_SIZE: '10',
					N8N_USER_FOLDER: n8nUserFolder,
				},
				onOutput: (line: string) => {
					if (line.includes('Editor is now accessible')) {
						n8nReady = true;
					}
				},
				getPlaceholder: n8nSpinner,
			});
		}

		const keyHandlers = [];
		if (hasN8n) {
			keyHandlers.push(createOpenN8nHandler());
		}

		const headerText = await getCommandHeader('n8n-node dev');

		runCommands({
			commands: commandsList,
			keyHandlers,
			helpText: () => buildHelpText(hasN8n, n8nReady),
			headerText,
		});
	}
}
