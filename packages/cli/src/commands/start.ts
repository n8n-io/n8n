/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import path from 'path';
import { mkdir } from 'fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import localtunnel from 'localtunnel';
import { BinaryDataManager, TUNNEL_SUBDOMAIN_ENV, UserSettings } from 'n8n-core';
import { Command, flags } from '@oclif/command';
import stream from 'stream';
import replaceStream from 'replacestream';
import { promisify } from 'util';
import glob from 'fast-glob';

import { LoggerProxy, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';
import { createHash } from 'crypto';
import config from '@/config';

import * as ActiveExecutions from '@/ActiveExecutions';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import * as Db from '@/Db';
import { ExternalHooks } from '@/ExternalHooks';
import * as GenericHelpers from '@/GenericHelpers';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { InternalHooksManager } from '@/InternalHooksManager';
import * as Server from '@/Server';
import * as TestWebhooks from '@/TestWebhooks';
import { WaitTracker } from '@/WaitTracker';

import { getLogger } from '@/Logger';
import { getAllInstalledPackages } from '@/CommunityNodes/packageModel';
import { handleLdapInit } from '@/Ldap/helpers';
import { initErrorHandling } from '@/ErrorReporting';
import * as CrashJournal from '@/CrashJournal';
import { createPostHogLoadingScript } from '@/telemetry/scripts';
import { EDITOR_UI_DIST_DIR, GENERATED_STATIC_DIR } from '@/constants';
import { eventBus } from '../eventbus';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const open = require('open');
const pipeline = promisify(stream.pipeline);

let activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner | undefined;

const exitWithCrash = async (message: string, error: unknown) => {
	ErrorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
	await sleep(2000);
	process.exit(1);
};

const exitSuccessFully = async () => {
	try {
		await CrashJournal.cleanup();
	} finally {
		process.exit();
	}
};

export class Start extends Command {
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

	/**
	 * Opens the UI in browser
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static openBrowser() {
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
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static async stopProcess() {
		getLogger().info('\nStopping n8n...');

		try {
			// Stop with trying to activate workflows that could not be activated
			activeWorkflowRunner?.removeAllQueuedWorkflowActivations();

			const externalHooks = ExternalHooks();
			await externalHooks.run('n8n.stop', []);

			setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				console.log('process exited after 30s');
				await exitSuccessFully();
			}, 30000);

			await InternalHooksManager.getInstance().onN8nStop();

			const skipWebhookDeregistration = config.getEnv(
				'endpoints.skipWebhooksDeregistrationOnShutdown',
			);

			const removePromises = [];
			if (activeWorkflowRunner !== undefined && !skipWebhookDeregistration) {
				removePromises.push(activeWorkflowRunner.removeAll());
			}

			// Remove all test webhooks
			const testWebhooks = TestWebhooks.getInstance();
			removePromises.push(testWebhooks.removeAll());

			await Promise.all(removePromises);

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = ActiveExecutions.getInstance();
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
			await exitWithCrash('There was an error shutting down n8n.', error);
		}

		await exitSuccessFully();
	}

	static async generateStaticAssets() {
		// Read the index file and replace the path placeholder
		const n8nPath = config.getEnv('path');
		const hooksUrls = config.getEnv('externalFrontendHooksUrls');

		let scriptsString = '';
		if (hooksUrls) {
			scriptsString = hooksUrls.split(';').reduce((acc, curr) => {
				return `${acc}<script src="${curr}"></script>`;
			}, '');
		}

		if (config.getEnv('diagnostics.enabled')) {
			const phLoadingScript = createPostHogLoadingScript({
				apiKey: config.getEnv('diagnostics.config.posthog.apiKey'),
				apiHost: config.getEnv('diagnostics.config.posthog.apiHost'),
				autocapture: false,
				disableSessionRecording: config.getEnv(
					'diagnostics.config.posthog.disableSessionRecording',
				),
				debug: config.getEnv('logs.level') === 'debug',
			});

			scriptsString += phLoadingScript;
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

	async run() {
		// Make sure that n8n shuts down gracefully if possible
		process.once('SIGTERM', Start.stopProcess);
		process.once('SIGINT', Start.stopProcess);

		const logger = getLogger();
		LoggerProxy.init(logger);
		logger.info('Initializing n8n process');

		await initErrorHandling();
		await CrashJournal.init();

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Start);

		try {
			// Start directly with the init of the database to improve startup time
			await Db.init().catch(async (error: Error) =>
				exitWithCrash('There was an error initializing DB', error),
			);

			// Make sure the settings exist
			const userSettings = await UserSettings.prepareUserSettings();

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

			if (!config.getEnv('endpoints.disableUi')) {
				await Start.generateStaticAssets();
			}

			// Load all node and credential types
			const loadNodesAndCredentials = LoadNodesAndCredentials();
			await loadNodesAndCredentials.init();

			// Load all external hooks
			const externalHooks = ExternalHooks();
			await externalHooks.init();

			// Add the found types to an instance other parts of the application can use
			const nodeTypes = NodeTypes(loadNodesAndCredentials);
			const credentialTypes = CredentialTypes(loadNodesAndCredentials);

			// Load the credentials overwrites if any exist
			CredentialsOverwrites(credentialTypes);

			await loadNodesAndCredentials.generateTypesForFrontend();

			const installedPackages = await getAllInstalledPackages();
			const missingPackages = new Set<{
				packageName: string;
				version: string;
			}>();
			installedPackages.forEach((installedPackage) => {
				installedPackage.installedNodes.forEach((installedNode) => {
					if (!loadNodesAndCredentials.known.nodes[installedNode.type]) {
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
				config.set(setting.key, JSON.parse(setting.value));
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
							// eslint-disable-next-line no-await-in-loop
							void (await loadNodesAndCredentials.loadNpmModule(
								missingPackage.packageName,
								missingPackage.version,
							));
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
				} else if (userSettings.tunnelSubdomain !== undefined) {
					tunnelSubdomain = userSettings.tunnelSubdomain;
				}

				if (tunnelSubdomain === undefined) {
					// When no tunnel subdomain did exist yet create a new random one
					const availableCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
					userSettings.tunnelSubdomain = Array.from({ length: 24 })
						.map(() => {
							return availableCharacters.charAt(
								Math.floor(Math.random() * availableCharacters.length),
							);
						})
						.join('');

					await UserSettings.writeUserSettings(userSettings);
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

			const instanceId = await UserSettings.getInstanceId();
			await InternalHooksManager.init(instanceId, nodeTypes);

			const binaryDataConfig = config.getEnv('binaryDataManager');
			await BinaryDataManager.init(binaryDataConfig, true);

			await Server.start();

			// Start to get active workflows and run their triggers
			activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
			await activeWorkflowRunner.init();

			WaitTracker();

			await handleLdapInit();

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
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				let inputText = '';

				if (flags.open) {
					Start.openBrowser();
				}
				this.log('\nPress "o" to open in Browser.');
				process.stdin.on('data', (key: string) => {
					if (key === 'o') {
						Start.openBrowser();
						inputText = '';
					} else if (key.charCodeAt(0) === 3) {
						// Ctrl + c got pressed
						// eslint-disable-next-line @typescript-eslint/no-floating-promises
						Start.stopProcess();
					} else {
						// When anything else got pressed, record it and send it on enter into the child process
						// eslint-disable-next-line no-lonely-if
						if (key.charCodeAt(0) === 13) {
							// send to child process and print in terminal
							process.stdout.write('\n');
							inputText = '';
						} else {
							// record it and write into terminal
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							inputText += key;
							process.stdout.write(key);
						}
					}
				});
			}
		} catch (error) {
			await exitWithCrash('There was an error', error);
		}
	}
}
