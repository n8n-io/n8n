import { Command, Flags } from '@oclif/core';
import os from 'node:os';
import path from 'node:path';
import picocolors from 'picocolors';

import {
	buildHelpText,
	type CommandConfig,
	createOpenN8nHandler,
	createSpinner,
	readPackageName,
	runCommands,
	triggerReload,
	waitForN8n,
	watchStaticFiles,
} from './utils';
import {
	assertEngineRunning,
	detectContainerEngine,
	removeContainer,
} from '../../utils/container-engine';
import { createSymlink, ensureFolder } from '../../utils/filesystem';
import { detectPackageManager } from '../../utils/package-manager';
import { getCommandHeader, onCancel } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';
import { copyStaticFiles } from '../build';

/** Where the n8n container looks for custom nodes. */
const CONTAINER_CUSTOM_NODES = '/home/node/.n8n/custom/node_modules';
/** Named volume so workflows and credentials survive a restart. */
const DATA_VOLUME = 'n8n-node-cli-data';

export default class Dev extends Command {
	static override description = 'Run n8n with the node and rebuild on changes for live preview';
	static override examples = [
		'<%= config.bin %> <%= command.id %>',
		'<%= config.bin %> <%= command.id %> --n8n-version 2.20.7',
		'<%= config.bin %> <%= command.id %> --n8n-image n8nio/n8n:local',
		'<%= config.bin %> <%= command.id %> --external-n8n',
	];
	static override flags = {
		'external-n8n': Flags.boolean({
			default: false,
			description:
				'By default n8n-node dev runs n8n in a container. Enable this option if you would like to run n8n elsewhere. Make sure to set N8N_DEV_RELOAD=true there, and point --custom-user-folder at its N8N_USER_FOLDER.',
		}),
		'n8n-version': Flags.string({
			default: 'latest',
			description: 'Version tag of the n8n image to run.',
		}),
		'n8n-image': Flags.string({
			env: 'N8N_NODE_DEV_IMAGE',
			description:
				'Full image reference to run, overriding --n8n-version. Use this to test a locally built image (e.g. n8nio/n8n:local).',
		}),
		'n8n-url': Flags.string({
			default: 'http://localhost:5678',
			description: 'URL n8n is reachable at. Used for hot reload, readiness and "o" to open.',
		}),
		'custom-user-folder': Flags.directory({
			default: path.join(os.homedir(), '.n8n-node-cli'),
			description:
				'Only used with --external-n8n: the N8N_USER_FOLDER of that instance. The node is linked into <folder>/.n8n/custom.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);

		const packageManager = (await detectPackageManager()) ?? 'npm';

		await copyStaticFiles();

		const packageName = await readPackageName();
		const invalidNodeNameError = validateNodeName(packageName);
		if (invalidNodeNameError) return onCancel(invalidNodeNameError);

		const baseUrl = flags['n8n-url'].replace(/\/$/, '');
		const runsN8n = !flags['external-n8n'];
		const projectDir = process.cwd();

		const commandsList: CommandConfig[] = [];
		const notes: string[] = [];

		if (runsN8n) {
			const image = flags['n8n-image'] ?? `docker.n8n.io/n8nio/n8n:${flags['n8n-version']}`;

			let engine;
			try {
				engine = await detectContainerEngine();
				await assertEngineRunning(engine);
			} catch (error) {
				return onCancel(error instanceof Error ? error.message : String(error));
			}

			const containerName = `n8n-node-dev-${packageName.replace(/[^a-zA-Z0-9_.-]/g, '-')}`;
			// SELinux needs the mount relabelled; ignored by Podman on macOS/Windows.
			const mountSuffix = engine === 'podman' ? ':z' : '';

			removeContainer(engine, containerName);
			process.on('exit', () => removeContainer(engine, containerName));

			commandsList.push({
				cmd: engine,
				args: [
					'run',
					'--rm',
					'--name',
					containerName,
					'-p',
					`${new URL(baseUrl).port || '5678'}:5678`,
					'-v',
					`${DATA_VOLUME}:/home/node/.n8n`,
					'-v',
					`${projectDir}:${CONTAINER_CUSTOM_NODES}/${packageName}${mountSuffix}`,
					'-e',
					'N8N_DEV_RELOAD=true',
					'-e',
					'N8N_DIAGNOSTICS_ENABLED=false',
					image,
				],
				name: `n8n Server (${image})`,
				getPlaceholder: createSpinner(
					() => `Starting n8n... ${picocolors.dim('(this can take a while on first run)')}`,
				),
			});

			notes.push(`${picocolors.dim('image')} ${image} ${picocolors.dim(`via ${engine}`)}`);
		} else {
			// External n8n loads nodes from its own N8N_USER_FOLDER, so the link has
			// to land there — otherwise the node silently never shows up.
			const customNodesFolder = path.join(flags['custom-user-folder'], '.n8n', 'custom');
			const nodeModulesFolder = path.join(customNodesFolder, 'node_modules');
			await ensureFolder(nodeModulesFolder);

			try {
				await createSymlink(projectDir, path.join(nodeModulesFolder, packageName));
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unknown error creating symbolic link';
				return onCancel(`Failed to create symbolic link: ${message}`);
			}

			notes.push(
				`${picocolors.dim('external n8n must run with')} N8N_DEV_RELOAD=true N8N_USER_FOLDER=${flags['custom-user-folder']}`,
			);
		}

		commandsList.unshift({
			cmd: packageManager,
			args: ['exec', '--', 'tsc', '--watch', '--pretty'],
			name: 'TypeScript Build (watching)',
			onOutput: (line: string) => {
				// tsc --watch prints this after every clean emit
				if (line.includes('Found 0 errors')) void triggerReload(baseUrl);
			},
		});

		let n8nReady = false;
		void waitForN8n(baseUrl).then((ready) => {
			n8nReady = ready;
		});

		watchStaticFiles(() => {
			void copyStaticFiles().then(async () => await triggerReload(baseUrl));
		});

		const headerText = [await getCommandHeader('n8n-node dev'), ...notes].join('\n');

		runCommands({
			commands: commandsList,
			keyHandlers: [createOpenN8nHandler(baseUrl)],
			helpText: () => buildHelpText(true, n8nReady),
			headerText,
		});
	}
}
