import * as fs from 'fs';
import { Command, flags } from '@oclif/command';
import {
	UserSettings,
} from 'n8n-core';
import {
	INode, IRun, Workflow,
} from 'n8n-workflow';

import {
	ActiveExecutions,
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	IExecutionsCurrentSummary,
	IWorkflowExecutionDataProcess,
	LoadNodesAndCredentials,
	NodeTypes,
	WorkflowCredentials,
	WorkflowRunner,
} from "../src";

import { 
	sep 
}  from 'path';

import { 
	diff,
	diffString
} from 'json-diff';
import { ObjectID, UpdateValuesMissingError } from 'typeorm';

import { 
	getLogger,
} from '../src/Logger';

import {
	LoggerProxy,
} from 'n8n-workflow';

const colorOutput = true;

function updateProgress(executionProgress: IWorkflowExecutionProgress[]) {
	process.stdout.clearLine(-1);
    process.stdout.cursorTo(0);
	const results = executionProgress.map(execution => {
		let openColor = '', closeColor = '';
		if (colorOutput) {
			openColor = execution.status === 'success' ? "\x1b[32m" : (execution.status === 'error' ? "\x1b[31m" : "\x1b[0m");
			closeColor = "\x1b[0m";
		}
		return openColor + execution.workflowId + closeColor;
	});
    process.stdout.write("Running batch; workflow IDs " + results.join(','));
}

function updateError(workflowId: string | number | Object, workflowExecutionsProgress: IWorkflowExecutionProgress[]) {
	const workflowProgress = workflowExecutionsProgress.find(executionProgress => executionProgress.workflowId === workflowId);
	if (workflowProgress !== undefined) {
		workflowProgress.status = 'error';
	}
	updateProgress(workflowExecutionsProgress);
}

function updateSuccess(workflowId: string | number | Object, workflowExecutionsProgress: IWorkflowExecutionProgress[]) {
	const workflowProgress = workflowExecutionsProgress.find(executionProgress => executionProgress.workflowId === workflowId);
	if (workflowProgress !== undefined) {
		workflowProgress.status = 'success';
	}
	updateProgress(workflowExecutionsProgress);
}

export class ExecuteAll extends Command {
	static description = '\nExecutes all workflows once';

	static cancelled = false;
	
	static examples = [
		`$ n8n executeAll`,
		`$ n8n executeAll --concurrency=10`,
		`$ n8n executeAll --debug --output=/data/output.json`,
		`$ n8n executeAll --ids=10,13,15`,
		`$ n8n executeAll --snapshot=/data/snapshots`,
		`$ n8n executeAll --compare=/data/previousExecutionData`,
	];
	
	static flags = {
		help: flags.help({ char: 'h' }),
		debug: flags.boolean({
			description: 'Toggles on displaying all errors and debug messages.',
		}),
		ids: flags.string({
			description: 'Specifies workflow IDs to get executed, separated by a comma.',
		}),
		concurrency: flags.integer({
			default: 0,
			description: 'How many workflows can run in parallel.',
		}),
		output: flags.string({
			description: 'Enable execution saving, You must inform an existing folder to save execution via this param',
		}),
		snapshot: flags.string({
			description: 'Enables snapshot saving. You must inform an existing folder to save snapshots via this param.',
		}),
		compare: flags.string({
			description: 'Compares current execution with an existing snapshot. You must inform an existing folder where the snapshots are saved.',
		}),
	};

	static async stopProcess() {
		this.cancelled = true;
		const activeExecutionsInstance = ActiveExecutions.getInstance();
		const stopPromises = activeExecutionsInstance.getActiveExecutions().map(async execution => {
			activeExecutionsInstance.stopExecution(execution.id);
		});

		await Promise.allSettled(stopPromises);

		setTimeout(() => {
			process.exit(0);
		}, 30000);

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
		process.exit(0);
	}
	
	
	async run() {

		process.on('SIGTERM', ExecuteAll.stopProcess);
		process.on('SIGINT', ExecuteAll.stopProcess);

		const logger = getLogger();
		LoggerProxy.init(logger);

		const executionTimeout = 3 * 60 * 1000;
				

		const { flags } = this.parse(ExecuteAll);
		
		const debug = flags.debug !== undefined;
		const ids: number[] = [];
		const concurrency = flags.concurrency;

		if (flags.snapshot !== undefined) {
			if (fs.existsSync(flags.snapshot)) {
				if (!fs.lstatSync(flags.snapshot).isDirectory()) {
					console.log(`The parameter --snapshot must be an existing directory`);
					return;
				}
			} else {
				console.log(`The parameter --snapshot must be an existing directory`);
				return;
			}
		}
		if (flags.compare !== undefined) {
			if (fs.existsSync(flags.compare)) {
				if (!fs.lstatSync(flags.compare).isDirectory()) {
					console.log(`The parameter --compare must be an existing directory`);
					return;
				}
			} else {
				console.log(`The parameter --compare must be an existing directory`);
				return;
			}
		}

		if (flags.output !== undefined) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					console.log(`The parameter --output must be a writable file`);
					return;
				}
			}
		}
		
		if (flags.ids !== undefined) {
			const paramIds = flags.ids.split(',');
			const re = /\d+/;
			const matchedIDs = paramIds.filter(id => id.match(re) ).map(id => parseInt(id, 10));

			if (matchedIDs.length === 0) {
				console.log(`The parameter --ids must be a list of numeric IDs separated by a comma.`);
				return;
			}

			ids.push(...matchedIDs);

		}
		// Start directly with the init of the database to improve startup time
		const startDbInitPromise = Db.init();
		
		// Load all node and credential types
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();
		
		// Wait till the database is ready
		await startDbInitPromise;
		
		let allWorkflows;

		if (ids.length !== 0) {
			allWorkflows = await Db.collections!.Workflow!.findByIds(ids);
		} else {
			allWorkflows = await Db.collections!.Workflow!.find();
		}

		if (debug === true) {
			this.log(`Found ${allWorkflows.length} workflows to execute.`);
		}
		
		// Make sure the settings exist
		await UserSettings.prepareUserSettings();
		
		// Wait till the n8n-packages have been read
		await loadNodesAndCredentialsPromise;
		
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
		
		const result:IResult = {
			workflowsNumber:allWorkflows.length,
			summary:{
				failedExecutions:0,
				succeededExecution:0,
				exceptions:0,
				errors: [],
			},
			coveredNodes:{},
			executions:[],
		};

		// Check if the workflow contains the required "Start" node
		// "requiredNodeTypes" are also defined in editor-ui/views/NodeView.vue
		const requiredNodeTypes = ['n8n-nodes-base.start'];
		let workflowsExecutionsPromises:Array<Promise<IRun | undefined>> = [];
		let workflowExecutionsProgress:Array<IWorkflowExecutionProgress> = [];
		for (let i = 0; i < allWorkflows.length; i++) {
			if (ExecuteAll.cancelled) {
				break;
			}
			const workflowData = allWorkflows[i];
			
			const executionResult:IExecutionResult = {
				workflowId: workflowData.id,
				executionTime: 0,
				finished: false,
				nodes: workflowData.nodes.map(node => ({
					name: node.name,
					typeVersion: node.typeVersion,
					type: node.type,
				})),
				error:'',
				changes:'',
			};

			let startNode: INode | undefined= undefined;
			for (const node of workflowData!.nodes) {
				if (requiredNodeTypes.includes(node.type)) {
					startNode = node;
					break;
				}
			}
			
			if (startNode === undefined) {
				// If the workflow does not contain a start-node we can not know what
				// should be executed and with which data to start.
				executionResult.error = 'Workflow cannot be started as it does not contain a "Start" node.';
				result.summary.failedExecutions++;
				result.executions.push(executionResult);
				continue;
			}

			workflowExecutionsProgress.push({
				workflowId: workflowData.id,
				status: 'running',
			});
			
			workflowsExecutionsPromises.push(
				new Promise(async (resolve,reject) => {
					let gotCancel = false;
					
					// Timeouts execution after 5 minutes.
					const timeoutTimer = setTimeout(() => {
						gotCancel = true;
						executionResult.error = 'Workflow execution timed out.';
						result.summary.failedExecutions++;
						result.executions.push(executionResult);
						result.summary.errors.push({workflowId: workflowData.id, error: executionResult.error});
						reject(new Error('Workflow execution timed out.'));
					}, executionTimeout);
					try {
						const credentials = await WorkflowCredentials(workflowData!.nodes);

						const runData: IWorkflowExecutionDataProcess = {
							credentials,
							executionMode: 'cli',
							startNodes: [startNode!.name],
							workflowData: workflowData!,
						};

						const workflowRunner = new WorkflowRunner();
						const executionId = await workflowRunner.run(runData);

						const activeExecutions = ActiveExecutions.getInstance();
						const data = await activeExecutions.getPostExecutePromise(executionId);
						if (gotCancel) {
							// The promise was rejected already so we simply ignore.
							return;
						}

						if (data === undefined) {
							executionResult.error = 'Workflow did not return any data.';
							result.summary.failedExecutions++;
							result.executions.push(executionResult);
							result.summary.errors.push({workflowId: workflowData.id, error: executionResult.error});
							updateError(workflowData.id, workflowExecutionsProgress);
						}else{

							workflowData.nodes.forEach(node => {
								result.coveredNodes[node.type] = (result.coveredNodes[node.type] || 0) +1; 
							});
							executionResult.executionTime = (Date.parse(data.stoppedAt as unknown as string) - Date.parse(data.startedAt as unknown as string))/1000; 
							executionResult.finished = (data?.finished !== undefined) as boolean; 

							if (data.data.resultData.error) {
								executionResult.error = 
									data.data.resultData.error.hasOwnProperty('description') ? 
									// @ts-ignore
									data.data.resultData.error.description : data.data.resultData.error.message;
								if (data.data.resultData.lastNodeExecuted !== undefined) {
									executionResult.error += ` on node ${data.data.resultData.lastNodeExecuted}`;
								}
								result.summary.failedExecutions++;
								result.executions.push(executionResult);
								result.summary.errors.push({workflowId: workflowData.id, error: executionResult.error});
								updateError(workflowData.id, workflowExecutionsProgress);
								if (debug === true) {
									this.log(JSON.stringify(data, null, 2));
									console.log(data.data.resultData.error);
								}

							}else{

								const serializedData = JSON.stringify(data, null, 2);
								if (flags.compare === undefined){
									result.summary.succeededExecution++;
									result.executions.push(executionResult);
									updateSuccess(workflowData.id, workflowExecutionsProgress);
								} else {
									const fileName = (flags.compare.endsWith(sep) ? flags.compare : flags.compare + sep) + `${workflowData.id}-snapshot.json`;
									if (fs.existsSync(fileName) === true) {

										const contents = fs.readFileSync(fileName, {encoding: 'utf-8'});

										//@ts-ignore
										const changes = diff(JSON.parse(contents), data, {keysOnly: true}); // types are outdated here

										if (changes !== undefined) {
											// we have structural changes. Report them.
											executionResult.error = `Workflow may contain breaking changes`;
											executionResult.changes = changes;
											result.summary.failedExecutions++;
											result.executions.push(executionResult);
											result.summary.errors.push({workflowId: workflowData.id, error: executionResult.error});
											updateError(workflowData.id, workflowExecutionsProgress);
											if (debug === true) {
												// @ts-ignore
												console.log('Detailed changes: ', diffString(JSON.parse(contents), data, undefined, {keysOnly: true}));
											}
										}else{
											result.summary.succeededExecution++;
											result.executions.push(executionResult);
											updateSuccess(workflowData.id, workflowExecutionsProgress);
										}
									} else {
										executionResult.error = 'Snapshot for not found.';
										result.summary.failedExecutions++;
										result.executions.push(executionResult);
										result.summary.errors.push({workflowId: workflowData.id, error: executionResult.error});
										updateError(workflowData.id, workflowExecutionsProgress);
									}
								}
								// Save snapshots only after comparing - this is to make sure we're updating
								// After comparing to existing verion.
								if (flags.snapshot !== undefined) {
									const fileName = (flags.snapshot.endsWith(sep) ? flags.snapshot : flags.snapshot + sep) + `${workflowData.id}-snapshot.json`;
									fs.writeFileSync(fileName,serializedData);
								}
							}
						}
						resolve(data);
					} catch (e) {
						executionResult.error = 'Workflow failed to execute.';
						result.summary.exceptions++;
						result.executions.push(executionResult);
						updateError(workflowData.id, workflowExecutionsProgress);
						if (debug === true) {
							console.error(e.message);
							console.error(e.stack);
						}
						reject(e);
					}
					clearTimeout(timeoutTimer);
				})
			);
			if(concurrency === 0 || (i !== 0 && (i+1) % concurrency === 0)){
				process.stdout.write('\n');
				updateProgress(workflowExecutionsProgress);
				await Promise.allSettled(workflowsExecutionsPromises);
				workflowsExecutionsPromises = [];
				workflowExecutionsProgress = [];
			}

		}

		if(workflowsExecutionsPromises.length!==0){
			await Promise.allSettled(workflowsExecutionsPromises);
		}
		if(flags.output !== undefined){
			fs.writeFileSync(flags.output,JSON.stringify(result, null, 2));
			console.log('Execution finished.');
			console.log('Summary:');
			console.log(`\tSuccess: ${result.summary.succeededExecution}`);
			console.log(`\tFailures: ${result.summary.failedExecutions}`);
			console.log(`\tExceptions: ${result.summary.exceptions}`);
			console.log('\nNodes covered:');
			Object.entries(result.coveredNodes).map(entry => {
				console.log(`\t${entry[0]}: ${entry[1]}`);
			});
			console.log('\nCheck the JSON file for more details.');
		}else{
			console.log(JSON.stringify(result, null, 2));
		}
		if(result.summary.succeededExecution !== result.workflowsNumber){
			this.exit(1);
		}
		this.exit(0);
	}
}

interface IResult {
	workflowsNumber:number;
	summary:{
		failedExecutions:number,
		succeededExecution:number,
		exceptions:number,
		errors:IExecutionError[],
	};
	coveredNodes:{
		[key:string]:number
	};
	executions:IExecutionResult[];
}
interface IExecutionResult{
	workflowId: string | number | ObjectID;
	executionTime: number;
	finished: boolean;
	nodes: Array<{
		name: string,
		typeVersion: number,
		type: string,
	}>;
	error: string;
	changes: string;
}

interface IExecutionError {
	workflowId: string | number | ObjectID;
	error: string;
}

interface IWorkflowExecutionProgress {
	workflowId: string | number | ObjectID;
	status: 'success' | 'error' | 'running';
}