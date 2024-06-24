import { Container } from 'typedi';
import { Flags, type Config } from '@oclif/core';
import express from 'express';
import http from 'http';
import type PCancelable from 'p-cancelable';
import { WorkflowExecute } from 'n8n-core';
import type { ExecutionStatus, IExecuteResponsePromiseData, INodeTypes, IRun } from 'n8n-workflow';
import { Workflow, sleep, ApplicationError } from 'n8n-workflow';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import config from '@/config';
import type { Job, JobResult } from '@/scaling-mode/types';
import { ScalingMode } from '@/scaling-mode/scaling-mode';
import { N8N_VERSION, inTest } from '@/constants';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import type { ICredentialsOverwrite } from '@/Interfaces';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { rawBodyReader, bodyParser } from '@/middlewares';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import type { RedisServicePubSubSubscriber } from '@/services/redis/RedisServicePubSubSubscriber';
import { EventMessageGeneric } from '@/eventbus/EventMessageClasses/EventMessageGeneric';
import { OrchestrationHandlerWorkerService } from '@/services/orchestration/worker/orchestration.handler.worker.service';
import { OrchestrationWorkerService } from '@/services/orchestration/worker/orchestration.worker.service';
import type { WorkerJobStatusSummary } from '@/services/orchestration/worker/types';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { BaseCommand } from './BaseCommand';
import { encodeWebhookResponse } from '@/scaling-mode/webhook-response';

export class Worker extends BaseCommand {
	static description = '\nStarts a n8n worker';

	static examples = ['$ n8n worker --concurrency=5'];

	static flags = {
		help: Flags.help({ char: 'h' }),
		concurrency: Flags.integer({
			default: 10,
			description: 'How many jobs can run in parallel.',
		}),
	};

	static runningJobsSummary: {
		[jobId: string]: WorkerJobStatusSummary;
	} = {};

	/**
	 * How many jobs this worker may run concurrently.
	 *
	 * Taken from env var `N8N_CONCURRENCY_PRODUCTION_LIMIT` if set to a value
	 * other than -1, else taken from `--concurrency` flag.
	 *
	 * @docs https://docs.bullmq.io/guide/workers/concurrency#concurrency-factor
	 */
	concurrency: number;

	scalingMode: ScalingMode;

	redisSubscriber: RedisServicePubSubSubscriber;

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		this.logger.info('Stopping n8n...');

		await this.scalingMode.closeWorker();

		try {
			await this.externalHooks?.run('n8n.stop', []);

			const hardStopTimeMs = Date.now() + this.gracefulShutdownTimeoutInS * 1000;

			// Wait for active workflow executions to finish
			let count = 0;
			while (Object.keys(this.scalingMode.getRunningJobIds()).length !== 0) {
				if (count++ % 4 === 0) {
					const waitLeft = Math.ceil((hardStopTimeMs - Date.now()) / 1000);
					this.logger.info(
						`Waiting for ${
							Object.keys(this.scalingMode.getRunningJobIds()).length
						} active executions to finish... (max wait ${waitLeft} more seconds)`,
					);
				}

				await sleep(500);
			}
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	async runJob(job: Job, nodeTypes: INodeTypes): Promise<JobResult> {
		const { executionId, loadStaticData } = job.data;
		const executionRepository = Container.get(ExecutionRepository);
		const fullExecutionData = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!fullExecutionData) {
			this.logger.error(
				`Worker failed to find data of execution "${executionId}" in database. Cannot continue.`,
				{ executionId },
			);
			throw new ApplicationError(
				'Unable to find data of execution in database. Aborting execution.',
				{ extra: { executionId } },
			);
		}
		const workflowId = fullExecutionData.workflowData.id;

		this.logger.info(
			`Start job: ${job.id} (Workflow ID: ${workflowId} | Execution: ${executionId})`,
		);
		await executionRepository.updateStatus(executionId, 'running');

		let { staticData } = fullExecutionData.workflowData;
		if (loadStaticData) {
			const workflowData = await Container.get(WorkflowRepository).findOne({
				select: ['id', 'staticData'],
				where: {
					id: workflowId,
				},
			});
			if (workflowData === null) {
				this.logger.error(
					'Worker execution failed because workflow could not be found in database.',
					{ workflowId, executionId },
				);
				throw new ApplicationError('Workflow could not be found', { extra: { workflowId } });
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
			undefined,
			undefined,
			executionTimeoutTimestamp,
		);
		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
			fullExecutionData.mode,
			job.data.executionId,
			fullExecutionData.workflowData,
			{
				retryOf: fullExecutionData.retryOf as string,
			},
		);

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				await job.updateProgress({
					kind: 'webhook-response',
					executionId,
					response: encodeWebhookResponse(response),
				});
			},
		];

		additionalData.executionId = executionId;

		additionalData.setExecutionStatus = (status: ExecutionStatus) => {
			// Can't set the status directly in the queued worker, but it will happen in InternalHook.onWorkflowPostExecute
			this.logger.debug(`Queued worker execution status for ${executionId} is "${status}"`);
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

		this.scalingMode.registerRunningJob(job.id, workflowRun);
		Worker.runningJobsSummary[job.id] = {
			jobId: job.id.toString(),
			executionId,
			workflowId: fullExecutionData.workflowId ?? '',
			workflowName: fullExecutionData.workflowData.name,
			mode: fullExecutionData.mode,
			startedAt: fullExecutionData.startedAt,
			retryOf: fullExecutionData.retryOf ?? '',
			status: fullExecutionData.status,
		};

		// Wait till the execution is finished
		await workflowRun;

		this.scalingMode.deregisterRunningJob(job.id);
		delete Worker.runningJobsSummary[job.id];

		// do NOT call workflowExecuteAfter hook here, since it is being called from processSuccessExecution()
		// already!

		return {
			success: true,
		};
	}

	constructor(argv: string[], cmdConfig: Config) {
		super(argv, cmdConfig);

		if (!process.env.N8N_ENCRYPTION_KEY) {
			throw new ApplicationError(
				'Missing encryption key. Worker started without the required N8N_ENCRYPTION_KEY env var. More information: https://docs.n8n.io/hosting/configuration/configuration-examples/encryption-key/',
			);
		}

		this.setInstanceType('worker');
		this.setInstanceQueueModeId();
	}

	async init() {
		const { QUEUE_WORKER_TIMEOUT } = process.env;
		if (QUEUE_WORKER_TIMEOUT) {
			this.gracefulShutdownTimeoutInS =
				parseInt(QUEUE_WORKER_TIMEOUT, 10) || config.default('queue.bull.gracefulShutdownTimeout');
			this.logger.warn(
				'QUEUE_WORKER_TIMEOUT has been deprecated. Rename it to N8N_GRACEFUL_SHUTDOWN_TIMEOUT.',
			);
		}
		await this.initCrashJournal();

		this.logger.debug('Starting n8n worker...');
		this.logger.debug(`Queue mode id: ${this.queueModeId}`);

		await this.setConcurrency();
		await super.init();

		await this.initLicense();
		this.logger.debug('License init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		await this.initExternalSecrets();
		this.logger.debug('External secrets init complete');
		await this.initEventBus();
		this.logger.debug('Event bus init complete');
		await this.initScalingMode();
		this.logger.debug('Scaling mode init complete');
		await this.initOrchestration();
		this.logger.debug('Orchestration init complete');

		await Container.get(MessageEventBus).send(
			new EventMessageGeneric({
				eventName: 'n8n.worker.started',
				payload: {
					workerId: this.queueModeId,
				},
			}),
		);
	}

	async initEventBus() {
		await Container.get(MessageEventBus).initialize({
			workerId: this.queueModeId,
		});
	}

	/**
	 * Initializes the redis connection
	 * A publishing connection to redis is created to publish events to the event log
	 * A subscription connection to redis is created to subscribe to commands from the main process
	 * The subscription connection adds a handler to handle the command messages
	 */
	async initOrchestration() {
		await Container.get(OrchestrationWorkerService).init();
		await Container.get(OrchestrationHandlerWorkerService).initWithOptions({
			queueModeId: this.queueModeId,
			redisPublisher: Container.get(OrchestrationWorkerService).redisPublisher,
			getRunningJobIds: () => this.scalingMode.getRunningJobIds(),
			getRunningJobsSummary: () => Object.values(Worker.runningJobsSummary),
		});
	}

	async setConcurrency() {
		const { flags } = await this.parse(Worker);

		const envConcurrency = config.getEnv('executions.concurrency.productionLimit');

		this.concurrency = envConcurrency !== -1 ? envConcurrency : flags.concurrency;
	}

	async initScalingMode() {
		this.scalingMode = Container.get(ScalingMode);

		await this.scalingMode.setupQueue();

		const processorFn = async (job: Job) => await this.runJob(job, this.nodeTypes);

		await this.scalingMode.setupWorker(processorFn, { concurrency: this.concurrency });

		/**
		 * @TODO Do we want to have the worker auto-remove jobs? Or make this configurable?
		 *
		 * https://docs.bullmq.io/guide/going-to-production#auto-job-removal
		 * https://docs.bullmq.io/guide/workers/auto-removal-of-jobs
		 */
	}

	async setupHealthMonitor() {
		const port = config.getEnv('queue.health.port');

		const app = express();
		app.disable('x-powered-by');

		const server = http.createServer(app);

		app.get(
			'/healthz',

			async (_req: express.Request, res: express.Response) => {
				this.logger.debug('Health check started!');

				const connection = Db.getConnection();

				try {
					if (!connection.isInitialized) {
						// Connection is not active
						throw new ApplicationError('No active database connection');
					}
					// DB ping
					await connection.query('SELECT 1');
				} catch (e) {
					this.logger.error('No Database connection!', e as Error);
					const error = new ServiceUnavailableError('No Database connection!');
					return ResponseHelper.sendErrorResponse(res, error);
				}

				// Just to be complete, generally will the worker stop automatically
				// if it loses the connection to redis
				try {
					// Redis ping
					await this.scalingMode.pingStore();
				} catch (e) {
					this.logger.error('No Redis connection!', e as Error);
					const error = new ServiceUnavailableError('No Redis connection!');
					return ResponseHelper.sendErrorResponse(res, error);
				}

				// Everything fine
				const responseData = {
					status: 'ok',
				};

				this.logger.debug('Health check completed successfully!');

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

						Container.get(CredentialsOverwrites).setData(body);
						presetCredentialsLoaded = true;
						ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
					} else {
						ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
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
		await this.externalHooks?.run('worker.ready');
		this.logger.info(`\nn8n worker health check via, port ${port}`);
	}

	async run() {
		this.logger.info('\nn8n worker is now ready');
		this.logger.info(` * Version: ${N8N_VERSION}`);
		this.logger.info(` * Concurrency: ${this.concurrency}`);
		this.logger.info('');

		if (config.getEnv('queue.health.active')) {
			await this.setupHealthMonitor();
		}

		if (!inTest && process.stdout.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			process.stdin.on('data', (key: string) => {
				if (key.charCodeAt(0) === 3) process.kill(process.pid, 'SIGINT'); // ctrl+c
			});
		}

		// Make sure that the process does not close
		if (!inTest) await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Worker exiting due to an error.', error);
	}
}
