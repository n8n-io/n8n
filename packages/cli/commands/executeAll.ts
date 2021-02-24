import * as fs from 'fs';
import { Command, flags } from '@oclif/command';
import {
	UserSettings,
} from 'n8n-core';
import {
	INode,
} from 'n8n-workflow';

import {
	ActiveExecutions,
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	GenericHelpers,
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
import { ObjectID } from 'typeorm';

export class ExecuteAll extends Command {
	static description = '\nExecutes all workflows once';
	
	static examples = [
		`$ n8n executeAll`,
		`$ n8n executeAll --debug`,
		`$ n8n executeAll --snapshot=/data/snapshots`,
	];
	
	static flags = {
		help: flags.help({ char: 'h' }),
		debug: flags.boolean({
			description: 'Toggles on displaying all errors and debug messages.',
		}),
		json: flags.boolean({
			description: 'Toggles on displaying results in JSON format.',
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
	
	
	async run() {
		const { flags } = this.parse(ExecuteAll);
		
		const debug = flags.debug !== undefined;
		const json = flags.json !== undefined;

		if (flags.snapshot !== undefined) {
			if (fs.existsSync(flags.snapshot)) {
				if (!fs.lstatSync(flags.snapshot).isDirectory()) {
					GenericHelpers.logOutput(`The paramenter --snapshot must be an existing directory`);
					return;
				}
			} else {
				GenericHelpers.logOutput(`The paramenter --snapshot must be an existing directory`);
				return;
			}
		}
		if (flags.compare !== undefined) {
			if (fs.existsSync(flags.compare)) {
				if (!fs.lstatSync(flags.compare).isDirectory()) {
					GenericHelpers.logOutput(`The paramenter --compare must be an existing directory`);
					return;
				}
			} else {
				GenericHelpers.logOutput(`The paramenter --compare must be an existing directory`);
				return;
			}
		}

		if (flags.output !== undefined) {
			if (fs.existsSync(flags.output)) {
				if (!fs.lstatSync(flags.output).isDirectory()) {
					GenericHelpers.logOutput(`The paramenter --output must be an existing directory`);
					return;
				}
			} else {
				GenericHelpers.logOutput(`The paramenter --output must be an existing directory`);
				return;
			}
		}
		
		if (flags.output !== undefined && json!==true) {
			GenericHelpers.logOutput(`You must inform an json format --json when using --output`);
		}
		// Start directly with the init of the database to improve startup time
		const startDbInitPromise = Db.init();
		
		// Load all node and credential types
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();
		
		// Wait till the database is ready
		await startDbInitPromise;
		
		const allWorkflows = await Db.collections!.Workflow!.find();
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
				succeeedExecution:0,
				exceptions:0,
			},
			nodesCovered:{},
			executions:[],
		};

		// Check if the workflow contains the required "Start" node
		// "requiredNodeTypes" are also defined in editor-ui/views/NodeView.vue
		const requiredNodeTypes = ['n8n-nodes-base.start'];
		for (let i = 0; i < allWorkflows.length; i++) {
			const workflowData = allWorkflows[i];
			
			if (debug === true) {
				this.log(`Starting execution of workflow ID ${workflowData.id}.`);
			}
			
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
				if (json === true) {
					executionResult.error = 'Workflow cannot be started as it does not contain a "Start" node.';
					result.summary.failedExecutions++;
					result.executions.push(executionResult);
				}else{
					GenericHelpers.logOutput(`Workflow ID ${workflowData.id} cannot be started as it does not contain a "Start" node.`);
				}
				continue;
			}
			
			try {
				const credentials = await WorkflowCredentials(workflowData!.nodes);
				
				const runData: IWorkflowExecutionDataProcess = {
					credentials,
					executionMode: 'cli',
					startNodes: [startNode.name],
					workflowData: workflowData!,
				};
				
				const workflowRunner = new WorkflowRunner();
				const executionId = await workflowRunner.run(runData);
				
				const activeExecutions = ActiveExecutions.getInstance();
				const data = await activeExecutions.getPostExecutePromise(executionId);
				
				if (data === undefined) {
					if (json === true) {
						executionResult.error = 'Workflow did not return any data.';
						result.summary.failedExecutions++;
						result.executions.push(executionResult);
					}else{
						GenericHelpers.logOutput(`Workflow ${workflowData.id} did not return any data.`);
					}
					continue;
				}
				workflowData.nodes.forEach(node => {
					result.nodesCovered[node.type] = (result.nodesCovered[node.type] || 0) +1; 
				});
				executionResult.executionTime = (Date.parse(data.stoppedAt as unknown as string) - Date.parse(data.startedAt as unknown as string))/1000; 
				executionResult.finished = (data?.finished !== undefined) as boolean; 

				if (data.data.resultData.error) {
					if (json === true) {
						executionResult.error = data.data.resultData.error.message;
						result.summary.failedExecutions++;
						result.executions.push(executionResult);
					}else{
						GenericHelpers.logOutput(`Workflow ${workflowData.id} failed.`);
					}
					if (debug === true) {
						this.log(JSON.stringify(data, null, 2));
						console.log(data.data.resultData.error);
					}
					continue;
				}

				const serializedData = JSON.stringify(data, null, 2);
				if (json === true) {
					if (flags.compare === undefined){
						result.summary.succeeedExecution++;
						result.executions.push(executionResult);
					}
				}else{
					GenericHelpers.logOutput(`Workflow ${workflowData.id} succeeded.`);
				}			
				if (flags.compare !== undefined) {
					const fileName = (flags.compare.endsWith(sep) ? flags.compare : flags.compare + sep) + `${workflowData.id}-snapshot.json`;
					if (fs.existsSync(fileName) === true) {

						const contents = fs.readFileSync(fileName, {encoding: 'utf-8'});

						//@ts-ignore
						const changes = diff(JSON.parse(contents), data, {keysOnly: true}); // types are outdated here
						
						if (changes !== undefined) {
							// we have structural changes. Report them.
							if (json === true) {
								executionResult.error = `Workflow may contain breaking changes`;
								executionResult.changes = changes;
								result.summary.failedExecutions++;
								result.executions.push(executionResult);
							}else{
								console.log(`Workflow ID ${workflowData.id} may contain breaking changes: `, changes);
							}
							if (debug === true) {
								// @ts-ignore
								console.log('Detailed changes: ', diffString(JSON.parse(contents), data, undefined, {keysOnly: true}));
							}
						}else{
							if (json === true) {
								result.summary.succeeedExecution++;
								result.executions.push(executionResult);
							}
						}
					} else {
						if (json === true) {
							executionResult.error = 'Snapshot for not found.';
							result.summary.failedExecutions++;
							result.executions.push(executionResult);
						}else{
							GenericHelpers.logOutput(`Snapshot for ${workflowData.id} not found.`);
						}
					}
				}
				// Save snapshots only after comparing - this is to make sure we're updating
				// After comparing to existing verion.
				if (flags.snapshot !== undefined) {
					const fileName = (flags.snapshot.endsWith(sep) ? flags.snapshot : flags.snapshot + sep) + `${workflowData.id}-snapshot.json`;
					fs.writeFileSync(fileName,serializedData);
				}

			} catch (e) {
				if (json === true) {
					executionResult.error = 'Workflow failed to execute.';
					result.summary.exceptions++;
					result.executions.push(executionResult);
				}else{
					GenericHelpers.logOutput(`Workflow ${workflowData.id} failed to execute.`);
				}
				if (debug === true) {
					console.error(e.message);
					console.error(e.stack);
				}
			}
			
		}
		if (json === true){
			if(flags.output !== undefined){
				const fileName = (flags.output.endsWith(sep) ? flags.output : flags.output + sep) + `workflows-executions-${Date.now()}.json`;
				fs.writeFileSync(fileName,JSON.stringify(result, null, 2));
			}else{
				GenericHelpers.logOutput(JSON.stringify(result, null, 2));
			}
		}
		if(result.summary.succeeedExecution !== result.workflowsNumber){
			this.exit(1);
		}
		this.exit(0);
	}
}

interface IResult {
	workflowsNumber:number;
	summary:{
		failedExecutions:number,
		succeeedExecution:number,
		exceptions:number,
	};
	nodesCovered:{
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