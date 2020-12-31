import * as PCancelable from 'p-cancelable';

import { Command, flags } from '@oclif/command';
import {
	UserSettings,
	WorkflowExecute,
} from 'n8n-core';

import {
	INodeTypes,
	IRun,
	IWorkflowExecuteHooks,
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';

import {
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

	runningJobs: {
		[key: string]: PCancelable<IRun>;
	} = {};


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


		const workflow = new Workflow({ id: jobData.workflowData.id as string, name: jobData.workflowData.name, nodes: jobData.workflowData!.nodes, connections: jobData.workflowData!.connections, active: jobData.workflowData!.active, nodeTypes, staticData: jobData.workflowData!.staticData, settings: jobData.workflowData!.settings });

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

		this.runningJobs[job.id] = workflowRun;

		// Wait till the execution is finished
		const runData = await workflowRun;

		delete this.runningJobs[job.id];

		return {
			runData,
		};
	}

	async run() {
		console.log('Starting n8n worker...');

		try {
			const { flags } = this.parse(Worker);

			// Start directly with the init of the database to improve startup time
			const startDbInitPromise = Db.init().catch(error => {
				console.error(`There was an error initializing DB: ${error.message}`);

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
			const redisOptions = config.get('queue.bull.redis') as object;
			const jobQueue = new Bull('jobs', { prefix, redis: redisOptions });
			jobQueue.process(flags.concurrency, (job) => this.runJob(job, nodeTypes));

			const versions = await GenericHelpers.getVersions();

			console.log('\nn8n worker is now ready');
			console.log(` * Version: ${versions.cli}`);
			console.log(` * Concurrency: ${flags.concurrency}`);
			console.log('');

			jobQueue.on('global:progress', (jobId, progress) => {
				// Progress of a job got updated which does get used
				// to communicate that a job got canceled.

				if (progress === -1) {
					// Job has to get canceled
					if (this.runningJobs[jobId] !== undefined) {
						// Job is processed by current worker so cancel
						this.runningJobs[jobId].cancel();
						delete this.runningJobs[jobId];
					}
				}
			});


		} catch (e) {
			// TODO: Do some testing here how to really display the error
			// this.error(`There was an error: ${error.message}`);
			console.error('\nGOT ERROR');
			console.log('====================================');
			console.error(e.message);
			console.error(e.stack);

			// @ts-ignore
			process.emit('SIGINT');
		}
	}
}
