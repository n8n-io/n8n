/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { BinaryDataManager, UserSettings } from 'n8n-core';
import { Command, flags } from '@oclif/command';
import Redis from 'ioredis';

import { IDataObject, LoggerProxy, sleep } from 'n8n-workflow';
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
import * as WebhookServer from '@/WebhookServer';
import { getLogger } from '@/Logger';
import { initErrorHandling } from '@/ErrorReporting';
import * as CrashJournal from '@/CrashJournal';

let activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner | undefined;
let processExitCode = 0;

export class Webhook extends Command {
	static description = 'Starts n8n webhook process. Intercepts only production URLs.';

	static examples = [`$ n8n webhook`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	/**
	 * Stops n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static async stopProcess() {
		LoggerProxy.info(`\nStopping n8n...`);

		const exit = () => {
			CrashJournal.cleanup().finally(() => {
				process.exit(processExitCode);
			});
		};

		try {
			const externalHooks = ExternalHooks();
			await externalHooks.run('n8n.stop', []);

			setTimeout(() => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				exit();
			}, 30000);

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = ActiveExecutions.getInstance();
			let executingWorkflows = activeExecutionsInstance.getActiveExecutions();

			let count = 0;
			while (executingWorkflows.length !== 0) {
				if (count++ % 4 === 0) {
					LoggerProxy.info(
						`Waiting for ${executingWorkflows.length} active executions to finish...`,
					);
				}
				// eslint-disable-next-line no-await-in-loop
				await sleep(500);
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}
		} catch (error) {
			LoggerProxy.error('There was an error shutting down n8n.', error);
		}

		exit();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// Make sure that n8n shuts down gracefully if possible
		process.once('SIGTERM', Webhook.stopProcess);
		process.once('SIGINT', Webhook.stopProcess);

		initErrorHandling();
		await CrashJournal.init();

		// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-shadow
		const { flags } = this.parse(Webhook);

		// Wrap that the process does not close but we can still use async
		await (async () => {
			if (config.getEnv('executions.mode') !== 'queue') {
				/**
				 * It is technically possible to run without queues but
				 * there are 2 known bugs when running in this mode:
				 * - Executions list will be problematic as the main process
				 * is not aware of current executions in the webhook processes
				 * and therefore will display all current executions as error
				 * as it is unable to determine if it is still running or crashed
				 * - You cannot stop currently executing jobs from webhook processes
				 * when running without queues as the main process cannot talk to
				 * the webhook processes to communicate workflow execution interruption.
				 */

				this.error('Webhook processes can only run with execution mode as queue.');
			}

			try {
				// Start directly with the init of the database to improve startup time
				const startDbInitPromise = Db.init().catch((error) => {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
					logger.error(`There was an error initializing DB: "${error.message}"`);

					processExitCode = 1;
					// @ts-ignore
					process.emit('SIGINT');
					process.exit(1);
				});

				// Make sure the settings exist
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				await UserSettings.prepareUserSettings();

				// Load all node and credential types
				const loadNodesAndCredentials = LoadNodesAndCredentials();
				await loadNodesAndCredentials.init();

				// Add the found types to an instance other parts of the application can use
				const nodeTypes = NodeTypes(loadNodesAndCredentials);
				const credentialTypes = CredentialTypes(loadNodesAndCredentials);

				// Load the credentials overwrites if any exist
				await CredentialsOverwrites(credentialTypes).init();

				// Load all external hooks
				const externalHooks = ExternalHooks();
				await externalHooks.init();

				// Wait till the database is ready
				await startDbInitPromise;

				const instanceId = await UserSettings.getInstanceId();
				const { cli } = await GenericHelpers.getVersions();
				InternalHooksManager.init(instanceId, cli, nodeTypes);

				const binaryDataConfig = config.getEnv('binaryDataManager');
				await BinaryDataManager.init(binaryDataConfig);

				if (config.getEnv('executions.mode') === 'queue') {
					const redisHost = config.getEnv('queue.bull.redis.host');
					const redisPassword = config.getEnv('queue.bull.redis.password');
					const redisPort = config.getEnv('queue.bull.redis.port');
					const redisDB = config.getEnv('queue.bull.redis.db');
					const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');
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

				await WebhookServer.start();

				// Start to get active workflows and run their triggers
				activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
				await activeWorkflowRunner.initWebhooks();

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const editorUrl = GenericHelpers.getBaseUrl();
				console.info('Webhook listener waiting for requests.');
			} catch (error) {
				console.error('Exiting due to error. See log message for details.');
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				logger.error(`Webhook process cannot continue. "${error.message}"`);

				processExitCode = 1;
				// @ts-ignore
				process.emit('SIGINT');
				process.exit(1);
			}
		})();
	}
}
