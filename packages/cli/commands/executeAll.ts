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
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	LoadNodesAndCredentials,
	NodeTypes,
	WorkflowCredentials,
	WorkflowHelpers,
	WorkflowRunner,
} from "../src";

import { 
	sep 
}  from 'path';


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
		snapshot: flags.string({
			description: 'Enables snapshot saving. You must inform an existing folder to save snapshots via this param.',
		}),
	};
	
	
	async run() {
		const { flags } = this.parse(ExecuteAll);
		
		const debug = flags.debug !== undefined;

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
		
		// Start directly with the init of the database to improve startup time
		const startDbInitPromise = Db.init();
		
		// Load all node and credential types
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();
		
		// Wait till the database is ready
		await startDbInitPromise;
		
		const allWorkflows = await Db.collections!.Workflow!.find();
		if (debug) {
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
		
		// Check if the workflow contains the required "Start" node
		// "requiredNodeTypes" are also defined in editor-ui/views/NodeView.vue
		const requiredNodeTypes = ['n8n-nodes-base.start'];
		for (let i = 0; i < allWorkflows.length; i++) {
			const workflowData = allWorkflows[i];
			
			if (debug) {
				this.log(`Starting execution of workflow ID ${workflowData.id}.`);
			}
			
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
				GenericHelpers.logOutput(`Workflow ID ${workflowData.id} cannot be started as it does not contain a "Start" node.`);
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
					GenericHelpers.logOutput(`Workflow ${workflowData.id} did not return any data.`);
					continue;
				}
				
				if (data.data.resultData.error) {
					GenericHelpers.logOutput(`Workflow ${workflowData.id} failed.`);
					if (debug) {
						this.log(JSON.stringify(data, null, 2));
						console.log(data.data.resultData.error);
					}
					continue;
				}
				GenericHelpers.logOutput(`Workflow ${workflowData.id} succeeded.`);
				if (flags.snapshot !== undefined) {
					const fileName = (flags.snapshot.endsWith(sep) ? flags.snapshot : flags.snapshot + sep) + `${workflowData.id}-snapshot.json`;
					fs.writeFileSync(fileName,JSON.stringify(data, null, 2));
				}
			} catch (e) {
				GenericHelpers.logOutput(`Workflow ${workflowData.id} failed.`);
				if (debug) {
					console.error(e.message);
					console.error(e.stack);
				}
			}
			
		}
		
		this.exit();
	}
}
