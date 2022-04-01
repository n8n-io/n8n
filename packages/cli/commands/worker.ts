/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-extraneous-dependencies
import * as express from 'express';
import * as http from 'http';
import * as PCancelable from 'p-cancelable';

import { Command, flags } from '@oclif/command';
import { BinaryDataManager, IBinaryDataConfig, UserSettings, WorkflowExecute } from 'n8n-core';

import { IExecuteResponsePromiseData, INodeTypes, IRun, Workflow, LoggerProxy } from 'n8n-workflow';

import { FindOneOptions, getConnectionManager } from 'typeorm';

import * as Bull from 'bull';
import {
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	GenericHelpers,
	IBullJobData,
	IBullJobResponse,
	IBullWebhookResponse,
	IExecutionFlattedDb,
	InternalHooksManager,
	LoadNodesAndCredentials,
	NodeTypes,
	ResponseHelper,
	WebhookHelpers,
	WorkflowExecuteAdditionalData,
} from '../src';

import { getLogger } from '../src/Logger';

import * as config from '../config';
import * as Queue from '../src/Queue';
import {
	checkPermissionsForExecution,
	getWorkflowOwner,
} from '../src/UserManagement/UserManagementHelper';

export class Worker extends Command {
	static description = '\nStarts a n8n worker';

	static examples = [`$ n8n worker --concurrency=5`];

	static flags = {
		help: flags.help({ char: 'h' }),
		concurrency: flags.integer({
			default: 10,
			description: 'How many jobs can run in parallel.',
		}),
	};

	static runningJobs: {
		[key: string]: PCancelable<IRun>;
	} = {};

	static jobQueue: Bull.Queue;

	static processExistCode = 0;
	// static activeExecutions = ActiveExecutions.getInstance();

	/**
	 * Stoppes the n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	static async stopProcess() {
		LoggerProxy.info(`Stopping n8n...`);

		// Stop accepting new jobs
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		Worker.jobQueue.pause(true);

		try {
			const externalHooks = ExternalHooks();
			await externalHooks.run('n8n.stop', []);

			const maxStopTime = 30000;

			const stopTime = new Date().getTime() + maxStopTime;

			setTimeout(() => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				process.exit(Worker.processExistCode);
			}, maxStopTime);

			// Wait for active workflow executions to finish
			let count = 0;
			while (Object.keys(Worker.runningJobs).length !== 0) {
				if (count++ % 4 === 0) {
					const waitLeft = Math.ceil((stopTime - new Date().getTime()) / 1000);
					LoggerProxy.info(
						`Waiting for ${
							Object.keys(Worker.runningJobs).length
						} active executions to finish... (wait ${waitLeft} more seconds)`,
					);
				}
				// eslint-disable-next-line no-await-in-loop
				await new Promise((resolve) => {
					setTimeout(resolve, 500);
				});
			}
		} catch (error) {
			LoggerProxy.error('There was an error shutting down n8n.', error);
		}

		process.exit(Worker.processExistCode);
	}

	async runJob(job: Bull.Job, nodeTypes: INodeTypes): Promise<IBullJobResponse> {
		const jobData = job.data as IBullJobData;
		const executionDb = await Db.collections.Execution!.findOne(jobData.executionId);

		if (!executionDb) {
			LoggerProxy.error('Worker failed to find execution data in database. Cannot continue.', {
				executionId: jobData.executionId,
			});
			throw new Error('Unable to find execution data in database. Aborting execution.');
		}
		const currentExecutionDb = ResponseHelper.unflattenExecutionData(executionDb);
		LoggerProxy.info(
			`Start job: ${job.id} (Workflow ID: ${currentExecutionDb.workflowData.id} | Execution: ${jobData.executionId})`,
		);

		const workflowOwner = await getWorkflowOwner(currentExecutionDb.workflowData.id!.toString());

		let { staticData } = currentExecutionDb.workflowData;
		if (jobData.loadStaticData) {
			const findOptions = {
				select: ['id', 'staticData'],
			} as FindOneOptions;
			const workflowData = await Db.collections.Workflow!.findOne(
				currentExecutionDb.workflowData.id,
				findOptions,
			);
			if (workflowData === undefined) {
				LoggerProxy.error(
					'Worker execution failed because workflow could not be found in database.',
					{
						workflowId: currentExecutionDb.workflowData.id,
						executionId: jobData.executionId,
					},
				);
				throw new Error(
					`The workflow with the ID "${currentExecutionDb.workflowData.id}" could not be found`,
				);
			}
			staticData = workflowData.staticData;
		}

		let workflowTimeout = config.get('executions.timeout') as number; // initialize with default
		if (
			// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
			currentExecutionDb.workflowData.settings &&
			currentExecutionDb.workflowData.settings.executionTimeout
		) {
			workflowTimeout = currentExecutionDb.workflowData.settings.executionTimeout as number; // preference on workflow setting
		}

		let executionTimeoutTimestamp: number | undefined;
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout') as number);
			executionTimeoutTimestamp = Date.now() + workflowTimeout * 1000;
		}

		const workflow = new Workflow({
			id: currentExecutionDb.workflowData.id as string,
			name: currentExecutionDb.workflowData.name,
			nodes: currentExecutionDb.workflowData.nodes,
			connections: currentExecutionDb.workflowData.connections,
			active: currentExecutionDb.workflowData.active,
			nodeTypes,
			staticData,
			settings: currentExecutionDb.workflowData.settings,
		});

		await checkPermissionsForExecution(workflow, workflowOwner.id);

		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			workflowOwner.id,
			undefined,
			executionTimeoutTimestamp,
		);
		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
			currentExecutionDb.mode,
			job.data.executionId,
			currentExecutionDb.workflowData,
			{ retryOf: currentExecutionDb.retryOf as string },
		);

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				await job.progress({
					executionId: job.data.executionId as string,
					response: WebhookHelpers.encodeWebhookResponse(response),
				} as IBullWebhookResponse);
			},
		];

		additionalData.executionId = jobData.executionId;

		let workflowExecute: WorkflowExecute;
		let workflowRun: PCancelable<IRun>;
		if (currentExecutionDb.data !== undefined) {
			workflowExecute = new WorkflowExecute(
				additionalData,
				currentExecutionDb.mode,
				currentExecutionDb.data,
			);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else {
			// Execute all nodes
			// Can execute without webhook so go on
			workflowExecute = new WorkflowExecute(additionalData, currentExecutionDb.mode);
			workflowRun = workflowExecute.run(workflow);
		}

		Worker.runningJobs[job.id] = workflowRun;

		// Wait till the execution is finished
		await workflowRun;

		delete Worker.runningJobs[job.id];

		return {
			success: true,
		};
	}

	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line no-console
		console.info('Starting n8n worker...');

		// Make sure that n8n shuts down gracefully if possible
		process.on('SIGTERM', Worker.stopProcess);
		process.on('SIGINT', Worker.stopProcess);

		// Wrap that the process does not close but we can still use async
		await (async () => {
			try {
				const { flags } = this.parse(Worker);

				// Start directly with the init of the database to improve startup time
				const startDbInitPromise = Db.init().catch((error) => {
					logger.error(`There was an error initializing DB: "${error.message}"`);

					Worker.processExistCode = 1;
					// @ts-ignore
					process.emit('SIGINT');
					process.exit(1);
				});

				// Make sure the settings exist
				await UserSettings.prepareUserSettings();

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

				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const redisConnectionTimeoutLimit = config.get('queue.bull.redis.timeoutThreshold');

				Worker.jobQueue = Queue.getInstance().getBullObjectInstance();
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				Worker.jobQueue.process(flags.concurrency, async (job) => this.runJob(job, nodeTypes));

				const versions = await GenericHelpers.getVersions();
				const instanceId = await UserSettings.getInstanceId();

				InternalHooksManager.init(instanceId, versions.cli, nodeTypes);

				const binaryDataConfig = config.get('binaryDataManager') as IBinaryDataConfig;
				await BinaryDataManager.init(binaryDataConfig);

				console.info('\nn8n worker is now ready');
				console.info(` * Version: ${versions.cli}`);
				console.info(` * Concurrency: ${flags.concurrency}`);
				console.info('');

				Worker.jobQueue.on('global:progress', (jobId, progress) => {
					// Progress of a job got updated which does get used
					// to communicate that a job got canceled.

					if (progress === -1) {
						// Job has to get canceled
						if (Worker.runningJobs[jobId] !== undefined) {
							// Job is processed by current worker so cancel
							Worker.runningJobs[jobId].cancel();
							delete Worker.runningJobs[jobId];
						}
					}
				});

				let lastTimer = 0;
				let cumulativeTimeout = 0;
				Worker.jobQueue.on('error', (error: Error) => {
					if (error.toString().includes('ECONNREFUSED')) {
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
									`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
								);
								process.exit(1);
							}
						}
						logger.warn('Redis unavailable - trying to reconnect...');
					} else if (error.toString().includes('Error initializing Lua scripts')) {
						// This is a non-recoverable error
						// Happens when worker starts and Redis is unavailable
						// Even if Redis comes back online, worker will be zombie
						logger.error('Error initializing worker.');
						process.exit(2);
					} else {
						logger.error('Error from queue: ', error);
					}
				});

				if (config.get('queue.health.active')) {
					const port = config.get('queue.health.port') as number;

					const app = express();
					const server = http.createServer(app);

					app.get(
						'/healthz',
						// eslint-disable-next-line consistent-return
						async (req: express.Request, res: express.Response) => {
							LoggerProxy.debug('Health check started!');

							const connection = getConnectionManager().get();

							try {
								if (!connection.isConnected) {
									// Connection is not active
									throw new Error('No active database connection!');
								}
								// DB ping
								await connection.query('SELECT 1');
							} catch (e) {
								LoggerProxy.error('No Database connection!', e);
								const error = new ResponseHelper.ResponseError(
									'No Database connection!',
									undefined,
									503,
								);
								return ResponseHelper.sendErrorResponse(res, error);
							}

							// Just to be complete, generally will the worker stop automatically
							// if it loses the conection to redis
							try {
								// Redis ping
								await Worker.jobQueue.client.ping();
							} catch (e) {
								LoggerProxy.error('No Redis connection!', e);
								const error = new ResponseHelper.ResponseError(
									'No Redis connection!',
									undefined,
									503,
								);
								return ResponseHelper.sendErrorResponse(res, error);
							}

							// Everything fine
							const responseData = {
								status: 'ok',
							};

							LoggerProxy.debug('Health check completed successfully!');

							ResponseHelper.sendSuccessResponse(res, responseData, true, 200);
						},
					);

					server.listen(port, () => {
						console.info(`\nn8n worker health check via, port ${port}`);
					});

					server.on('error', (error: Error & { code: string }) => {
						if (error.code === 'EADDRINUSE') {
							console.log(
								`n8n's port ${port} is already in use. Do you have the n8n main process running on that port?`,
							);
							process.exit(1);
						}
					});
				}
			} catch (error) {
				logger.error(`Worker process cannot continue. "${error.message}"`);

				Worker.processExistCode = 1;
				// @ts-ignore
				process.emit('SIGINT');
				process.exit(1);
			}
		})();
	}
}
