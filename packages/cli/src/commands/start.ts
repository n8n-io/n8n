/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Container } from 'typedi';
import path from 'path';
import { mkdir } from 'fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import localtunnel from 'localtunnel';
import { TUNNEL_SUBDOMAIN_ENV, UserSettings } from 'n8n-core';
import { flags } from '@oclif/command';
import stream from 'stream';
import replaceStream from 'replacestream';
import { promisify } from 'util';
import glob from 'fast-glob';

import { LoggerProxy, sleep, jsonParse } from 'n8n-workflow';
import { createHash } from 'crypto';
import config from '@/config';

import { ActiveExecutions } from '@/ActiveExecutions';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import * as GenericHelpers from '@/GenericHelpers';
import { Server } from '@/Server';
import { TestWebhooks } from '@/TestWebhooks';
import { getAllInstalledPackages } from '@/CommunityNodes/packageModel';
import { EDITOR_UI_DIST_DIR, GENERATED_STATIC_DIR } from '@/constants';
import { eventBus } from '@/eventbus';
import { BaseCommand } from './BaseCommand';
import { InternalHooks } from '@/InternalHooks';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const open = require('open');
const pipeline = promisify(stream.pipeline);

export class Start extends BaseCommand {
	static description = 'Starts n8n. Makes Web-UI available and starts active workflows';

	static examples = [
		'$ n8n start',
		'$ n8n start --tunnel',
		'$ n8n start -o',
		'$ n8n start --tunnel -o',
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		open: flags.boolean({
			char: 'o',
			description: 'opens the UI automatically in browser',
		}),
		tunnel: flags.boolean({
			description:
				'runs the webhooks via a hooks.n8n.cloud tunnel server. Use only for testing and development!',
		}),
		reinstallMissingPackages: flags.boolean({
			description:
				'Attempts to self heal n8n if packages with nodes are missing. Might drastically increase startup times.',
		}),
	};

	protected activeWorkflowRunner: ActiveWorkflowRunner;

	protected server = new Server();

	/**
	 * Opens the UI in browser
	 */
	private openBrowser() {
		const editorUrl = GenericHelpers.getBaseUrl();

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		open(editorUrl, { wait: true }).catch((error: Error) => {
			console.log(
				`\nWas not able to open URL in browser. Please open manually by visiting:\n${editorUrl}\n`,
			);
		});
	}

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		this.logger.info('\nStopping n8n...');

		try {
			// Stop with trying to activate workflows that could not be activated
			this.activeWorkflowRunner.removeAllQueuedWorkflowActivations();

			await this.externalHooks.run('n8n.stop', []);

			setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				console.log('process exited after 30s');
				await this.exitSuccessFully();
			}, 30000);

			await Container.get(InternalHooks).onN8nStop();

			const skipWebhookDeregistration = config.getEnv(
				'endpoints.skipWebhooksDeregistrationOnShutdown',
			);

			const removePromises = [];
			if (!skipWebhookDeregistration) {
				removePromises.push(this.activeWorkflowRunner.removeAll());
			}

			// Remove all test webhooks
			const testWebhooks = Container.get(TestWebhooks);
			removePromises.push(testWebhooks.removeAll());

			await Promise.all(removePromises);

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = Container.get(ActiveExecutions);
			let executingWorkflows = activeExecutionsInstance.getActiveExecutions();

			let count = 0;
			while (executingWorkflows.length !== 0) {
				if (count++ % 4 === 0) {
					console.log(`Waiting for ${executingWorkflows.length} active executions to finish...`);
					// eslint-disable-next-line array-callback-return
					executingWorkflows.map((execution) => {
						console.log(` - Execution ID ${execution.id}, workflow ID: ${execution.workflowId}`);
					});
				}
				// eslint-disable-next-line no-await-in-loop
				await sleep(500);
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}

			//finally shut down Event Bus
			await eventBus.close();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	private async generateStaticAssets() {
		// Read the index file and replace the path placeholder
		const n8nPath = config.getEnv('path');
		const restEndpoint = config.getEnv('endpoints.rest');
		const hooksUrls = config.getEnv('externalFrontendHooksUrls');

		let scriptsString = '';
		if (hooksUrls) {
			scriptsString = hooksUrls.split(';').reduce((acc, curr) => {
				return `${acc}<script src="${curr}"></script>`;
			}, '');
		}

		const closingTitleTag = '</title>';
		const compileFile = async (fileName: string) => {
			const filePath = path.join(EDITOR_UI_DIST_DIR, fileName);
			if (/(index\.html)|.*\.(js|css)/.test(filePath) && existsSync(filePath)) {
				const destFile = path.join(GENERATED_STATIC_DIR, fileName);
				await mkdir(path.dirname(destFile), { recursive: true });
				const streams = [
					createReadStream(filePath, 'utf-8'),
					replaceStream('/{{BASE_PATH}}/', n8nPath, { ignoreCase: false }),
					replaceStream('/%7B%7BBASE_PATH%7D%7D/', n8nPath, { ignoreCase: false }),
					replaceStream('/static/', n8nPath + 'static/', { ignoreCase: false }),
				];
				if (filePath.endsWith('index.html')) {
					streams.push(
						replaceStream('{{REST_ENDPOINT}}', restEndpoint, { ignoreCase: false }),
						replaceStream(closingTitleTag, closingTitleTag + scriptsString, {
							ignoreCase: false,
						}),
					);
				}
				streams.push(createWriteStream(destFile, 'utf-8'));
				return pipeline(streams);
			}
		};

		await compileFile('index.html');
		const files = await glob('**/*.{css,js}', { cwd: EDITOR_UI_DIST_DIR });
		await Promise.all(files.map(compileFile));
	}

	async init() {
		await this.initCrashJournal();

		await super.init();
		this.logger.info('Initializing n8n process');
		this.activeWorkflowRunner = Container.get(ActiveWorkflowRunner);

		await this.initLicense();
		await this.initBinaryManager();
		await this.initExternalHooks();

		if (!config.getEnv('endpoints.disableUi')) {
			await this.generateStaticAssets();
		}
	}

	async run() {
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Start);

		if (!config.getEnv('userManagement.jwtSecret')) {
			// If we don't have a JWT secret set, generate
			// one based and save to config.
			const encryptionKey = await UserSettings.getEncryptionKey();

			// For a key off every other letter from encryption key
			// CAREFUL: do not change this or it breaks all existing tokens.
			let baseKey = '';
			for (let i = 0; i < encryptionKey.length; i += 2) {
				baseKey += encryptionKey[i];
			}
			config.set('userManagement.jwtSecret', createHash('sha256').update(baseKey).digest('hex'));
		}

		await this.loadNodesAndCredentials.generateTypesForFrontend();

		const installedPackages = await getAllInstalledPackages();
		const missingPackages = new Set<{
			packageName: string;
			version: string;
		}>();
		installedPackages.forEach((installedPackage) => {
			installedPackage.installedNodes.forEach((installedNode) => {
				if (!this.loadNodesAndCredentials.known.nodes[installedNode.type]) {
					// Leave the list ready for installing in case we need.
					missingPackages.add({
						packageName: installedPackage.packageName,
						version: installedPackage.installedVersion,
					});
				}
			});
		});

		await UserSettings.getEncryptionKey();

		// Load settings from database and set them to config.
		const databaseSettings = await Db.collections.Settings.findBy({ loadOnStartup: true });
		databaseSettings.forEach((setting) => {
			config.set(setting.key, jsonParse(setting.value, { fallbackValue: setting.value }));
		});

		config.set('nodes.packagesMissing', '');
		if (missingPackages.size) {
			LoggerProxy.error(
				'n8n detected that some packages are missing. For more information, visit https://docs.n8n.io/integrations/community-nodes/troubleshooting/',
			);

			if (flags.reinstallMissingPackages || process.env.N8N_REINSTALL_MISSING_PACKAGES) {
				LoggerProxy.info('Attempting to reinstall missing packages', { missingPackages });
				try {
					// Optimistic approach - stop if any installation fails
					// eslint-disable-next-line no-restricted-syntax
					for (const missingPackage of missingPackages) {
						await this.loadNodesAndCredentials.installNpmModule(
							missingPackage.packageName,
							missingPackage.version,
						);
						missingPackages.delete(missingPackage);
					}
					LoggerProxy.info('Packages reinstalled successfully. Resuming regular initialization.');
				} catch (error) {
					LoggerProxy.error('n8n was unable to install the missing packages.');
				}
			}

			config.set(
				'nodes.packagesMissing',
				Array.from(missingPackages)
					.map((missingPackage) => `${missingPackage.packageName}@${missingPackage.version}`)
					.join(' '),
			);
		}

		const dbType = config.getEnv('database.type');
		if (dbType === 'sqlite') {
			const shouldRunVacuum = config.getEnv('database.sqlite.executeVacuumOnStartup');
			if (shouldRunVacuum) {
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				await Db.collections.Execution.query('VACUUM;');
			}
		}

		if (flags.tunnel) {
			this.log('\nWaiting for tunnel ...');

			let tunnelSubdomain;
			if (
				process.env[TUNNEL_SUBDOMAIN_ENV] !== undefined &&
				process.env[TUNNEL_SUBDOMAIN_ENV] !== ''
			) {
				tunnelSubdomain = process.env[TUNNEL_SUBDOMAIN_ENV];
			} else if (this.userSettings.tunnelSubdomain !== undefined) {
				tunnelSubdomain = this.userSettings.tunnelSubdomain;
			}

			if (tunnelSubdomain === undefined) {
				// When no tunnel subdomain did exist yet create a new random one
				const availableCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
				this.userSettings.tunnelSubdomain = Array.from({ length: 24 })
					.map(() => {
						return availableCharacters.charAt(
							Math.floor(Math.random() * availableCharacters.length),
						);
					})
					.join('');

				await UserSettings.writeUserSettings(this.userSettings);
			}

			const tunnelSettings: localtunnel.TunnelConfig = {
				host: 'https://hooks.n8n.cloud',
				subdomain: tunnelSubdomain,
			};

			const port = config.getEnv('port');

			// @ts-ignore
			const webhookTunnel = await localtunnel(port, tunnelSettings);

			process.env.WEBHOOK_URL = `${webhookTunnel.url}/`;
			this.log(`Tunnel URL: ${process.env.WEBHOOK_URL}\n`);
			this.log(
				'IMPORTANT! Do not share with anybody as it would give people access to your n8n instance!',
			);
		}

		await this.server.start();

		// Start to get active workflows and run their triggers
		await this.activeWorkflowRunner.init();

		const editorUrl = GenericHelpers.getBaseUrl();
		this.log(`\nEditor is now accessible via:\n${editorUrl}`);

		const saveManualExecutions = config.getEnv('executions.saveDataManualExecutions');

		if (saveManualExecutions) {
			this.log('\nManual executions will be visible only for the owner');
		}

		// Allow to open n8n editor by pressing "o"
		if (Boolean(process.stdout.isTTY) && process.stdin.setRawMode) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			if (flags.open) {
				this.openBrowser();
			}
			this.log('\nPress "o" to open in Browser.');
			process.stdin.on('data', (key: string) => {
				if (key === 'o') {
					this.openBrowser();
				} else if (key.charCodeAt(0) === 3) {
					// Ctrl + c got pressed
					// eslint-disable-next-line @typescript-eslint/no-floating-promises
					this.stopProcess();
				} else {
					// When anything else got pressed, record it and send it on enter into the child process
					// eslint-disable-next-line no-lonely-if
					if (key.charCodeAt(0) === 13) {
						// send to child process and print in terminal
						process.stdout.write('\n');
					} else {
						// record it and write into terminal
						process.stdout.write(key);
					}
				}
			});
		}
	}

	async catch(error: Error) {
		console.log(error.stack);
		await this.exitWithCrash('Exiting due to an error.', error);
	}
}
