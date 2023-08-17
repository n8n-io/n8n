import express from 'express';
import http from 'http';
import type PCancelable from 'p-cancelable';
import { Container } from 'typedi';

import { flags } from '@oclif/command';
import { WorkflowExecute } from 'n8n-core';

import type { ExecutionStatus, IExecuteResponsePromiseData, INodeTypes, IRun } from 'n8n-workflow';
import { Workflow, NodeOperationError, LoggerProxy, sleep } from 'n8n-workflow';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';

import config from '@/config';
import type { Job, JobId, JobQueue, JobResponse, WebhookResponse } from '@/Queue';
import { Queue } from '@/Queue';
import { generateFailedExecutionFromError } from '@/WorkflowHelpers';
import { N8N_VERSION } from '@/constants';
import { BaseCommand } from './BaseCommand';
import { ExecutionRepository } from '@db/repositories';
import { OwnershipService } from '@/services/ownership.service';
import { generateHostInstanceId } from '@/databases/utils/generators';
import type { ICredentialsOverwrite } from '@/Interfaces';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { rawBodyReader, bodyParser } from '@/middlewares';

export class Worker extends BaseCommand {
	static description = '\nStarts a n8n worker';

	static examples = ['$ n8n worker --concurrency=5'];

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

	static jobQueue: JobQueue;

	readonly uniqueInstanceId = generateHostInstanceId('worker');

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		LoggerProxy.info('Stopping n8n...');

		// Stop accepting new jobs
		await Worker.jobQueue.pause(true);

		try {
			await this.externalHooks.run('n8n.stop', []);

			const maxStopTime = config.getEnv('queue.bull.gracefulShutdownTimeout') * 1000;

			const stopTime = new Date().getTime() + maxStopTime;

			setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				await this.exitSuccessFully();
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

				await sleep(500);
			}
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	async runJob(job: Job, nodeTypes: INodeTypes): Promise<JobResponse> {
		const { executionId, loadStaticData } = job.data;
		const fullExecutionData = await Container.get(ExecutionRepository).findSingleExecution(
			executionId,
			{
				includeData: true,
				unflattenData: true,
			},
		);

		if (!fullExecutionData) {
			LoggerProxy.error(
				`Worker failed to find data of execution "${executionId}" in database. Cannot continue.`,
				{ executionId },
			);
			throw new Error(
				`Unable to find data of execution "${executionId}" in database. Aborting execution.`,
			);
		}
		const workflowId = fullExecutionData.workflowData.id!;
		LoggerProxy.info(
			`Start job: ${job.id} (Workflow ID: ${workflowId} | Execution: ${executionId})`,
		);

		const workflowOwner = await Container.get(OwnershipService).getWorkflowOwnerCached(workflowId);

		let { staticData } = fullExecutionData.workflowData;
		if (loadStaticData) {
			const workflowData = await Db.collections.Workflow.findOne({
				select: ['id', 'staticData'],
				where: {
					id: workflowId,
				},
			});
			if (workflowData === null) {
				LoggerProxy.error(
					'Worker execution failed because workflow could not be found in database.',
					{ workflowId, executionId },
				);
				throw new Error(`The workflow with the ID "${workflowId}" could not be found`);
			}
			staticData = workflowData.staticData;
		}

		const workflowSettings = fullExecutionData.workflowData.settings ?? {};

		let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout'); // initialize with default

		let executionTimeoutTimestamp: number | undefined;
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
			executionTimeoutTimestamp = Date.now() + workflowTimeout * 1000;
		}

		const workflow = new Workflow({
			id: workflowId,
			name: fullExecutionData.workflowData.name,
			nodes: fullExecutionData.workflowData.nodes,
			connections: fullExecutionData.workflowData.connections,
			active: fullExecutionData.workflowData.active,
			nodeTypes,
			staticData,
			settings: fullExecutionData.workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			workflowOwner.id,
			undefined,
			executionTimeoutTimestamp,
		);
		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
			fullExecutionData.mode,
			job.data.executionId,
			fullExecutionData.workflowData,
			{ retryOf: fullExecutionData.retryOf as string },
		);

		try {
			await PermissionChecker.check(workflow, workflowOwner.id);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				const failedExecution = generateFailedExecutionFromError(
					fullExecutionData.mode,
					error,
					error.node,
				);
				await additionalData.hooks.executeHookFunctions('workflowExecuteAfter', [failedExecution]);
			}
			return { success: true };
		}

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				const progress: WebhookResponse = {
					executionId,
					response: WebhookHelpers.encodeWebhookResponse(response),
				};
				await job.progress(progress);
			},
		];

		additionalData.executionId = executionId;

		additionalData.setExecutionStatus = (status: ExecutionStatus) => {
			// Can't set the status directly in the queued worker, but it will happen in InternalHook.onWorkflowPostExecute
			LoggerProxy.debug(`Queued worker execution status for ${executionId} is "${status}"`);
		};

		let workflowExecute: WorkflowExecute;
		let workflowRun: PCancelable<IRun>;
		if (fullExecutionData.data !== undefined) {
			workflowExecute = new WorkflowExecute(
				additionalData,
				fullExecutionData.mode,
				fullExecutionData.data,
			);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else {
			// Execute all nodes
			// Can execute without webhook so go on
			workflowExecute = new WorkflowExecute(additionalData, fullExecutionData.mode);
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

	async init() {
		await this.initCrashJournal();
		await super.init();
		this.logger.debug(`Worker ID: ${this.uniqueInstanceId}`);
		this.logger.debug('Starting n8n worker...');

		await this.initLicense();
		await this.initBinaryManager();
		await this.initExternalHooks();
	}

	async run() {
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Worker);

		const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');

		const queue = Container.get(Queue);
		await queue.init();
		Worker.jobQueue = queue.getBullObjectInstance();
		void Worker.jobQueue.process(flags.concurrency, async (job) =>
			this.runJob(job, this.nodeTypes),
		);

		this.logger.info('\nn8n worker is now ready');
		this.logger.info(` * Version: ${N8N_VERSION}`);
		this.logger.info(` * Concurrency: ${flags.concurrency}`);
		this.logger.info('');

		Worker.jobQueue.on('global:progress', (jobId: JobId, progress) => {
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
						this.logger.error(
							`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
						);
						process.exit(1);
					}
				}
				this.logger.warn('Redis unavailable - trying to reconnect...');
			} else if (error.toString().includes('Error initializing Lua scripts')) {
				// This is a non-recoverable error
				// Happens when worker starts and Redis is unavailable
				// Even if Redis comes back online, worker will be zombie
				this.logger.error('Error initializing worker.');
				process.exit(2);
			} else {
				this.logger.error('Error from queue: ', error);
				throw error;
			}
		});

		if (config.getEnv('queue.health.active')) {
			const port = config.getEnv('queue.health.port');

			const app = express();
			app.disable('x-powered-by');

			const server = http.createServer(app);

			app.get(
				'/healthz',

				async (req: express.Request, res: express.Response) => {
					LoggerProxy.debug('Health check started!');

					const connection = Db.getConnection();

					try {
						if (!connection.isInitialized) {
							// Connection is not active
							throw new Error('No active database connection!');
						}
						// DB ping
						await connection.query('SELECT 1');
					} catch (e) {
						LoggerProxy.error('No Database connection!', e as Error);
						const error = new ResponseHelper.ServiceUnavailableError('No Database connection!');
						return ResponseHelper.sendErrorResponse(res, error);
					}

					// Just to be complete, generally will the worker stop automatically
					// if it loses the connection to redis
					try {
						// Redis ping
						await Worker.jobQueue.client.ping();
					} catch (e) {
						LoggerProxy.error('No Redis connection!', e as Error);
						const error = new ResponseHelper.ServiceUnavailableError('No Redis connection!');
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

			let presetCredentialsLoaded = false;
			const endpointPresetCredentials = config.getEnv('credentials.overwrite.endpoint');
			if (endpointPresetCredentials !== '') {
				// POST endpoint to set preset credentials
				app.post(
					`/${endpointPresetCredentials}`,
					rawBodyReader,
					bodyParser,
					async (req: express.Request, res: express.Response) => {
						if (!presetCredentialsLoaded) {
							const body = req.body as ICredentialsOverwrite;

							if (req.contentType !== 'application/json') {
								ResponseHelper.sendErrorResponse(
									res,
									new Error(
										'Body must be a valid JSON, make sure the content-type is application/json',
									),
								);
								return;
							}

							CredentialsOverwrites().setData(body);
							presetCredentialsLoaded = true;
							ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
						} else {
							ResponseHelper.sendErrorResponse(
								res,
								new Error('Preset credentials can be set once'),
							);
						}
					},
				);
			}

			server.on('error', (error: Error & { code: string }) => {
				if (error.code === 'EADDRINUSE') {
					this.logger.error(
						`n8n's port ${port} is already in use. Do you have the n8n main process running on that port?`,
					);
					process.exit(1);
				}
			});

			await new Promise<void>((resolve) => server.listen(port, () => resolve()));
			await this.externalHooks.run('worker.ready');
			this.logger.info(`\nn8n worker health check via, port ${port}`);
		}

		// Make sure that the process does not close
		await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Worker exiting due to an error.', error);
	}
}
