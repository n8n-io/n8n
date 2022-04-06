/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as localtunnel from 'localtunnel';
import { BinaryDataManager, IBinaryDataConfig, TUNNEL_SUBDOMAIN_ENV, UserSettings } from 'n8n-core';
import { Command, flags } from '@oclif/command';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Redis from 'ioredis';

import { IDataObject, LoggerProxy } from 'n8n-workflow';
import { createHash } from 'crypto';
import * as config from '../config';
import {
	ActiveExecutions,
	ActiveWorkflowRunner,
	CredentialsOverwrites,
	CredentialTypes,
	DatabaseType,
	Db,
	ExternalHooks,
	GenericHelpers,
	InternalHooksManager,
	LoadNodesAndCredentials,
	NodeTypes,
	Server,
	TestWebhooks,
	WaitTracker,
} from '../src';

import { getLogger } from '../src/Logger';
import { RESPONSE_ERROR_MESSAGES } from '../src/constants';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const open = require('open');

let activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner | undefined;
let processExitCode = 0;

export class Start extends Command {
	static description = 'Starts n8n. Makes Web-UI available and starts active workflows';

	static examples = [
		`$ n8n start`,
		`$ n8n start --tunnel`,
		`$ n8n start -o`,
		`$ n8n start --tunnel -o`,
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
	 * Stoppes the n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static async stopProcess() {
		getLogger().info('\nStopping n8n...');

		try {
			const externalHooks = ExternalHooks();
			await externalHooks.run('n8n.stop', []);

			setTimeout(() => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				console.log(`process exited after 30s`);
				process.exit(processExitCode);
			}, 30000);

			await InternalHooksManager.getInstance().onN8nStop();

			const skipWebhookDeregistration = config.get(
				'endpoints.skipWebhoooksDeregistrationOnShutdown',
			) as boolean;

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
				await new Promise((resolve) => {
					setTimeout(resolve, 500);
				});
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}
		} catch (error) {
			console.error('There was an error shutting down n8n.', error);
		}

		process.exit(processExitCode);
	}

	async run() {
		// Make sure that n8n shuts down gracefully if possible
		process.on('SIGTERM', Start.stopProcess);
		process.on('SIGINT', Start.stopProcess);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Start);

		// Wrap that the process does not close but we can still use async
		await (async () => {
			try {
				const logger = getLogger();
				LoggerProxy.init(logger);
				logger.info('Initializing n8n process');

				// Start directly with the init of the database to improve startup time
				const startDbInitPromise = Db.init().catch((error: Error) => {
					logger.error(`There was an error initializing DB: "${error.message}"`);

					processExitCode = 1;
					// @ts-ignore
					process.emit('SIGINT');
					process.exit(1);
				});

				// Make sure the settings exist
				const userSettings = await UserSettings.prepareUserSettings();

				if (!config.get('userManagement.jwtSecret')) {
					// If we don't have a JWT secret set, generate
					// one based and save to config.
					const encryptionKey = await UserSettings.getEncryptionKey();
					if (!encryptionKey) {
						throw new Error('Fatal error setting up user management: no encryption key set.');
					}

					// For a key off every other letter from encryption key
					// CAREFUL: do not change this or it breaks all existing tokens.
					let baseKey = '';
					for (let i = 0; i < encryptionKey.length; i += 2) {
						baseKey += encryptionKey[i];
					}
					config.set(
						'userManagement.jwtSecret',
						createHash('sha256').update(baseKey).digest('hex'),
					);
				}

				// Load all node and credential types
				const loadNodesAndCredentials = LoadNodesAndCredentials();
				await loadNodesAndCredentials.init();

				// Load all external hooks
				const externalHooks = ExternalHooks();
				await externalHooks.init();

				// Add the found types to an instance other parts of the application can use
				const nodeTypes = NodeTypes();
				await nodeTypes.init(loadNodesAndCredentials.nodeTypes);
				const credentialTypes = CredentialTypes();
				await credentialTypes.init(loadNodesAndCredentials.credentialTypes);

				// Load the credentials overwrites if any exist
				const credentialsOverwrites = CredentialsOverwrites();
				await credentialsOverwrites.init();

				// Wait till the database is ready
				await startDbInitPromise;

				const encryptionKey = await UserSettings.getEncryptionKey();

				if (!encryptionKey) {
					throw new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY);
				}

				// Load settings from database and set them to config.
				const databaseSettings = await Db.collections.Settings!.find({ loadOnStartup: true });
				databaseSettings.forEach((setting) => {
					config.set(setting.key, JSON.parse(setting.value));
				});

				if (config.get('executions.mode') === 'queue') {
					const redisHost = config.get('queue.bull.redis.host');
					const redisPassword = config.get('queue.bull.redis.password');
					const redisPort = config.get('queue.bull.redis.port');
					const redisDB = config.get('queue.bull.redis.db');
					const redisConnectionTimeoutLimit = config.get('queue.bull.redis.timeoutThreshold');
					let lastTimer = 0;
					let cumulativeTimeout = 0;

					const settings = {
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						retryStrategy: (times: number): number | null => {
							const now = Date.now();
							if (now - lastTimer > 30000) {
								// Means we had no timeout at all or last timeout was temporary and we recovered
								lastTimer = now;
								cumulativeTimeout = 0;
							} else {
								cumulativeTimeout += now - lastTimer;
								lastTimer = now;
								if (cumulativeTimeout > redisConnectionTimeoutLimit) {
									logger.error(
										// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
										`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
									);
									process.exit(1);
								}
							}
							return 500;
						},
					} as IDataObject;

					if (redisHost) {
						settings.host = redisHost;
					}
					if (redisPassword) {
						settings.password = redisPassword;
					}
					if (redisPort) {
						settings.port = redisPort;
					}
					if (redisDB) {
						settings.db = redisDB;
					}

					// This connection is going to be our heartbeat
					// IORedis automatically pings redis and tries to reconnect
					// We will be using the retryStrategy above
					// to control how and when to exit.
					const redis = new Redis(settings);

					redis.on('error', (error) => {
						if (error.toString().includes('ECONNREFUSED') === true) {
							logger.warn('Redis unavailable - trying to reconnect...');
						} else {
							logger.warn('Error with Redis: ', error);
						}
					});
				}

				const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;

				if (dbType === 'sqlite') {
					const shouldRunVacuum = config.get('database.sqlite.executeVacuumOnStartup') as number;
					if (shouldRunVacuum) {
						// eslint-disable-next-line @typescript-eslint/no-floating-promises, @typescript-eslint/no-non-null-assertion
						await Db.collections.Execution!.query('VACUUM;');
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

					const port = config.get('port');

					// @ts-ignore
					const webhookTunnel = await localtunnel(port, tunnelSettings);

					process.env.WEBHOOK_URL = `${webhookTunnel.url}/`;
					this.log(`Tunnel URL: ${process.env.WEBHOOK_URL}\n`);
					this.log(
						'IMPORTANT! Do not share with anybody as it would give people access to your n8n instance!',
					);
				}

				const instanceId = await UserSettings.getInstanceId();
				const { cli } = await GenericHelpers.getVersions();
				InternalHooksManager.init(instanceId, cli, nodeTypes);

				const binaryDataConfig = config.get('binaryDataManager') as IBinaryDataConfig;
				await BinaryDataManager.init(binaryDataConfig, true);

				await Server.start();

				// Start to get active workflows and run their triggers
				activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
				await activeWorkflowRunner.init();

				WaitTracker();

				const editorUrl = GenericHelpers.getBaseUrl();
				this.log(`\nEditor is now accessible via:\n${editorUrl}`);

				const saveManualExecutions = config.get('executions.saveDataManualExecutions') as boolean;

				if (saveManualExecutions) {
					this.log('\nManual executions will be visible only for the owner');
				}

				// Allow to open n8n editor by pressing "o"
				if (Boolean(process.stdout.isTTY) && process.stdin.setRawMode) {
					process.stdin.setRawMode(true);
					process.stdin.resume();
					process.stdin.setEncoding('utf8');
					let inputText = '';

					if (flags.open) {
						Start.openBrowser();
					}
					this.log(`\nPress "o" to open in Browser.`);
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
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				this.error(`There was an error: ${error.message}`);

				processExitCode = 1;
				// @ts-ignore
				process.emit('SIGINT');
			}
		})();
	}
}
