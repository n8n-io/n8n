import * as PCancelable from 'p-cancelable';

import { Command, flags } from '@oclif/command';
import {
	UserSettings,
	WorkflowExecute,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypes,
	IRun,
	IWorkflowExecuteHooks,
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';

import {
	FindOneOptions,
} from 'typeorm';

import {
	ActiveExecutions,
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	GenericHelpers,
	IBullJobData,
	IBullJobResponse,
	LoadNodesAndCredentials,
	NodeTypes,
	WorkflowCredentials,
	WorkflowExecuteAdditionalData,
} from "../src";

import * as config from '../config';
import * as Bull from 'bull';

export class Worker extends Command {
	static description = '\nStarts a n8n worker';

	static examples = [
		`$ n8n worker --concurrency=5`,
	];

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
		console.log(`\nStopping n8n...`);

		// Stop accepting new jobs
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
					console.log(`Waiting for ${Object.keys(Worker.runningJobs).length} active executions to finish... (wait ${waitLeft} more seconds)`);
				}
				await new Promise((resolve) => {
					setTimeout(resolve, 500);
				});
			}

		} catch (error) {
			console.error('There was an error shutting down n8n.', error);
		}

		process.exit(Worker.processExistCode);
	}

	getWorkflowHooks(jobData: IBullJobData, executionId: string): WorkflowHooks {
		const hookFunctions: IWorkflowExecuteHooks = {};

		const preExecuteFunctions = WorkflowExecuteAdditionalData.hookFunctionsPreExecute();
		for (const key of Object.keys(preExecuteFunctions)) {
			if (hookFunctions[key] === undefined) {
				hookFunctions[key] = [];
			}
			hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
		}

		return new WorkflowHooks(hookFunctions, jobData.executionMode, executionId, jobData.workflowData, { retryOf: jobData.retryOf as string });
	}


	async runJob(job: Bull.Job, nodeTypes: INodeTypes): Promise<IBullJobResponse> {
		const jobData = job.data as IBullJobData;

		console.log(`Start job: ${job.id} (Workflow ID: ${jobData.workflowData.id})`);
		// TODO: Can in the future query most of that data from the DB to lighten redis load

		let staticData = jobData.workflowData!.staticData;
		if (jobData.loadStaticData === true) {
			const findOptions = {
				select: ['id', 'staticData'],
			} as FindOneOptions;
			const workflowData = await Db.collections!.Workflow!.findOne(jobData.workflowData.id, findOptions);
			if (workflowData === undefined) {
				throw new Error(`The workflow with the ID "${jobData.workflowData.id}" could not be found`);
			}
			staticData = workflowData.staticData;
		}

		const workflow = new Workflow({ id: jobData.workflowData.id as string, name: jobData.workflowData.name, nodes: jobData.workflowData!.nodes, connections: jobData.workflowData!.connections, active: jobData.workflowData!.active, nodeTypes, staticData, settings: jobData.workflowData!.settings });

		const credentials = await WorkflowCredentials(jobData.workflowData.nodes);

		const additionalData = await WorkflowExecuteAdditionalData.getBase(credentials);
		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksIntegrated(jobData.executionMode, job.data.executionId, jobData.workflowData, { retryOf: jobData.retryOf as string });

		let workflowExecute: WorkflowExecute;
		let workflowRun: PCancelable<IRun>;
		if (jobData.executionData !== undefined) {
			workflowExecute = new WorkflowExecute(additionalData, jobData.executionMode, jobData.executionData);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else if (jobData.runData === undefined || jobData.startNodes === undefined || jobData.startNodes.length === 0 || jobData.destinationNode === undefined) {
			// Execute all nodes

			// Can execute without webhook so go on
			workflowExecute = new WorkflowExecute(additionalData, jobData.executionMode);
			workflowRun = workflowExecute.run(workflow, undefined, jobData.destinationNode);
		} else {
			// Execute only the nodes between start and destination nodes
			workflowExecute = new WorkflowExecute(additionalData, jobData.executionMode);
			workflowRun = workflowExecute.runPartialWorkflow(workflow, jobData.runData, jobData.startNodes, jobData.destinationNode);
		}

		Worker.runningJobs[job.id] = workflowRun;

		// Wait till the execution is finished
		const runData = await workflowRun;

		delete Worker.runningJobs[job.id];

		return {
			runData,
		};
	}

	async run() {
		console.log('Starting n8n worker...');

		// Make sure that n8n shuts down gracefully if possible
		process.on('SIGTERM', Worker.stopProcess);
		process.on('SIGINT', Worker.stopProcess);

		// Wrap that the process does not close but we can still use async
		await (async () => {
			try {
				const { flags } = this.parse(Worker);

				// Start directly with the init of the database to improve startup time
				const startDbInitPromise = Db.init().catch(error => {
					console.error(`There was an error initializing DB: ${error.message}`);

					Worker.processExistCode = 1;
					// @ts-ignore
					process.emit('SIGINT');
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

				// Connect to bull-queue
				const prefix = config.get('queue.bull.prefix') as string;
				const redisOptions = config.get('queue.bull.redis') as IDataObject;
				const redisConnectionTimeoutLimit = config.get('queue.bull.redis.timeoutThreshold');
				redisOptions.enableReadyCheck = false;
				Worker.jobQueue = new Bull('jobs', { prefix, redis: redisOptions });
				Worker.jobQueue.process(flags.concurrency, (job) => this.runJob(job, nodeTypes));

				const versions = await GenericHelpers.getVersions();

				console.log('\nn8n worker is now ready');
				console.log(` * Version: ${versions.cli}`);
				console.log(` * Concurrency: ${flags.concurrency}`);
				console.log('');

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

				let lastTimer = 0, cumulativeTimeout = 0;
				Worker.jobQueue.on('error', (error: Error) => {
					if (error.toString().includes('ECONNREFUSED') === true) {
						const now = Date.now();
						if (now - lastTimer > 30000) {
							// Means we had no timeout at all or last timeout was temporary and we recovered
							lastTimer = now;
							cumulativeTimeout = 0;
						} else {
							cumulativeTimeout += now - lastTimer;
							lastTimer = now;
							if (cumulativeTimeout > redisConnectionTimeoutLimit) {
								console.error('Unable to connect to Redis after ' + redisConnectionTimeoutLimit + ". Exiting process.");
								process.exit(1);
							}
						}
						console.warn('Redis unavailable - trying to reconnect...');
					} else if (error.toString().includes('Error initializing Lua scripts') === true) {
						// This is a non-recoverable error
						// Happens when worker starts and Redis is unavailable
						// Even if Redis comes back online, worker will be zombie
						console.error('Error initializing worker.');
						process.exit(2);
					} else {
						console.error('Error from queue: ', error);
					}
				});
			} catch (error) {
				this.error(`There was an error: ${error.message}`);

				Worker.processExistCode = 1;
				// @ts-ignore
				process.emit('SIGINT');
			}
		})();

	}
}
