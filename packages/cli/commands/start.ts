import * as localtunnel from 'localtunnel';
import {
	TUNNEL_SUBDOMAIN_ENV,
	UserSettings,
} from 'n8n-core';
import { Command, flags } from '@oclif/command';
const open = require('open');
import * as Redis from 'ioredis';

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
	IExecutionsCurrentSummary,
	LoadNodesAndCredentials,
	NodeTypes,
	Server,
	TestWebhooks,
} from '../src';
import { IDataObject } from 'n8n-workflow';

import { 
	getLogger,
} from '../src/Logger';

import {
	LoggerProxy,
} from 'n8n-workflow';

let activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner | undefined;
let processExistCode = 0;

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
			description: 'runs the webhooks via a hooks.n8n.cloud tunnel server. Use only for testing and development!',
		}),
	};


	/**
	 * Opens the UI in browser
	 */
	static openBrowser() {
		const editorUrl = GenericHelpers.getBaseUrl();

		open(editorUrl, { wait: true })
			.catch((error: Error) => {
				console.log(`\nWas not able to open URL in browser. Please open manually by visiting:\n${editorUrl}\n`);
			});
	}


	/**
	 * Stoppes the n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	static async stopProcess() {
		getLogger().info('\nStopping n8n...');

		try {
			const externalHooks = ExternalHooks();
			await externalHooks.run('n8n.stop', []);

			setTimeout(() => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				process.exit(processExistCode);
			}, 30000);

			const skipWebhookDeregistration = config.get('endpoints.skipWebhoooksDeregistrationOnShutdown') as boolean;

			const removePromises = [];
			if (activeWorkflowRunner !== undefined && skipWebhookDeregistration !== true) {
				removePromises.push(activeWorkflowRunner.removeAll());
			}

			// Remove all test webhooks
			const testWebhooks = TestWebhooks.getInstance();
			removePromises.push(testWebhooks.removeAll());

			await Promise.all(removePromises);

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = ActiveExecutions.getInstance();
			let executingWorkflows = activeExecutionsInstance.getActiveExecutions() as IExecutionsCurrentSummary[];

			let count = 0;
			while (executingWorkflows.length !== 0) {
				if (count++ % 4 === 0) {
					console.log(`Waiting for ${executingWorkflows.length} active executions to finish...`);
					executingWorkflows.map(execution => {
						console.log(` - Execution ID ${execution.id}, workflow ID: ${execution.workflowId}`);
					});
				}
				await new Promise((resolve) => {
					setTimeout(resolve, 500);
				});
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}

		} catch (error) {
			console.error('There was an error shutting down n8n.', error);
		}

		process.exit(processExistCode);
	}


	async run() {
		// Make sure that n8n shuts down gracefully if possible
		process.on('SIGTERM', Start.stopProcess);
		process.on('SIGINT', Start.stopProcess);

		const { flags } = this.parse(Start);

		// Wrap that the process does not close but we can still use async
		await (async () => {
			try {
				const logger = getLogger();
				LoggerProxy.init(logger);
				logger.info('Initializing n8n process');

				// todo remove a few versions after release
				logger.info('\nn8n now checks for new versions and security updates. You can turn this off using the environment variable N8N_VERSION_NOTIFICATIONS_ENABLED to "false"\nFor more information, please refer to https://docs.n8n.io/getting-started/installation/advanced/configuration.html\n');

				// Start directly with the init of the database to improve startup time
				const startDbInitPromise = Db.init().catch((error: Error) => {
					logger.error(`There was an error initializing DB: "${error.message}"`);

					processExistCode = 1;
					// @ts-ignore
					process.emit('SIGINT');
					process.exit(1);
				});

				// Make sure the settings exist
				const userSettings = await UserSettings.prepareUserSettings();

				// Load all node and credential types
				const loadNodesAndCredentials = LoadNodesAndCredentials();
				await loadNodesAndCredentials.init();

				// Load the credentials overwrites if any exist
				const credentialsOverwrites = CredentialsOverwrites();
				await credentialsOverwrites.init();

				// Load all external hooks
				const externalHooks = ExternalHooks();
				await externalHooks.init();

				// Add the found types to an instance other parts of the application can use
				const nodeTypes = NodeTypes();
				await nodeTypes.init(loadNodesAndCredentials.nodeTypes);
				const credentialTypes = CredentialTypes();
				await credentialTypes.init(loadNodesAndCredentials.credentialTypes);

				// Wait till the database is ready
				await startDbInitPromise;

				if (config.get('executions.mode') === 'queue') {
					const redisHost = config.get('queue.bull.redis.host');
					const redisPassword = config.get('queue.bull.redis.password');
					const redisPort = config.get('queue.bull.redis.port');
					const redisDB = config.get('queue.bull.redis.db');
					const redisConnectionTimeoutLimit = config.get('queue.bull.redis.timeoutThreshold');
					let lastTimer = 0, cumulativeTimeout = 0;

					const settings = {
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
									logger.error('Unable to connect to Redis after ' + redisConnectionTimeoutLimit + ". Exiting process.");
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

				const dbType = await GenericHelpers.getConfigValue('database.type') as DatabaseType;

				if (dbType === 'sqlite') {
					const shouldRunVacuum = config.get('database.sqlite.executeVacuumOnStartup') as number;
					if (shouldRunVacuum) {
						Db.collections.Execution!.query('VACUUM;');
					}
				}

				if (flags.tunnel === true) {
					this.log('\nWaiting for tunnel ...');

					let tunnelSubdomain;
					if (process.env[TUNNEL_SUBDOMAIN_ENV] !== undefined && process.env[TUNNEL_SUBDOMAIN_ENV] !== '') {
						tunnelSubdomain = process.env[TUNNEL_SUBDOMAIN_ENV];
					} else if (userSettings.tunnelSubdomain !== undefined) {
						tunnelSubdomain = userSettings.tunnelSubdomain;
					}

					if (tunnelSubdomain === undefined) {
						// When no tunnel subdomain did exist yet create a new random one
						const availableCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
						userSettings.tunnelSubdomain = Array.from({ length: 24 }).map(() => {
							return availableCharacters.charAt(Math.floor(Math.random() * availableCharacters.length));
						}).join('');

						await UserSettings.writeUserSettings(userSettings);
					}

					const tunnelSettings: localtunnel.TunnelConfig = {
						host: 'https://hooks.n8n.cloud',
						subdomain: tunnelSubdomain,
					};

					const port = config.get('port') as number;

					// @ts-ignore
					const webhookTunnel = await localtunnel(port, tunnelSettings);

					process.env.WEBHOOK_URL = webhookTunnel.url + '/';
					this.log(`Tunnel URL: ${process.env.WEBHOOK_URL}\n`);
					this.log('IMPORTANT! Do not share with anybody as it would give people access to your n8n instance!');
				}

				await Server.start();

				// Start to get active workflows and run their triggers
				activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
				await activeWorkflowRunner.init();

				const editorUrl = GenericHelpers.getBaseUrl();
				this.log(`\nEditor is now accessible via:\n${editorUrl}`);

				// Allow to open n8n editor by pressing "o"
				if (Boolean(process.stdout.isTTY) && process.stdin.setRawMode) {
					process.stdin.setRawMode(true);
					process.stdin.resume();
					process.stdin.setEncoding('utf8');
					let inputText = '';

					if (flags.open === true) {
						Start.openBrowser();
					}
					this.log(`\nPress "o" to open in Browser.`);
					process.stdin.on('data', (key: string) => {
						if (key === 'o') {
							Start.openBrowser();
							inputText = '';
						} else if (key.charCodeAt(0) === 3) {
							// Ctrl + c got pressed
							Start.stopProcess();
						} else {
							// When anything else got pressed, record it and send it on enter into the child process
							if (key.charCodeAt(0) === 13) {
								// send to child process and print in terminal
								process.stdout.write('\n');
								inputText = '';
							} else {
								// record it and write into terminal
								inputText += key;
								process.stdout.write(key);
							}
						}
					});
				}
			} catch (error) {
				this.error(`There was an error: ${error.message}`);

				processExistCode = 1;
				// @ts-ignore
				process.emit('SIGINT');
			}
		})();
	}
}
