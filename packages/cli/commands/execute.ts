import { promises as fs } from 'fs';
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


export class Execute extends Command {
	static description = '\nExecutes a given workflow';

	static examples = [
		`$ n8n execute --id=5`,
		`$ n8n execute --file=workflow.json`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		file: flags.string({
			description: 'path to a workflow file to execute',
		}),
		id: flags.string({
			description: 'id of the workflow to execute',
		}),
	};


	async run() {
		const { flags } = this.parse(Execute);

		// Start directly with the init of the database to improve startup time
		const startDbInitPromise = Db.init();

		// Load all node and credential types
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();

		if (!flags.id && !flags.file) {
			GenericHelpers.logOutput(`Either option "--id" or "--file" have to be set!`);
			return;
		}

		if (flags.id && flags.file) {
			GenericHelpers.logOutput(`Either "id" or "file" can be set never both!`);
			return;
		}

		let workflowId: string | undefined;
		let workflowData: IWorkflowBase | undefined = undefined;
		if (flags.file) {
			// Path to workflow is given
			try {
				workflowData = JSON.parse(await fs.readFile(flags.file, 'utf8'));
			} catch (error) {
				if (error.code === 'ENOENT') {
					GenericHelpers.logOutput(`The file "${flags.file}" could not be found.`);
					return;
				}

				throw error;
			}

			// Do a basic check if the data in the file looks right
			// TODO: Later check with the help of TypeScript data if it is valid or not
			if (workflowData === undefined || workflowData.nodes === undefined || workflowData.connections === undefined) {
				GenericHelpers.logOutput(`The file "${flags.file}" does not contain valid workflow data.`);
				return;
			}
			workflowId = workflowData.id!.toString();
		}

		// Wait till the database is ready
		await startDbInitPromise;

		if (flags.id) {
			// Id of workflow is given
			workflowId = flags.id;
			workflowData = await Db.collections!.Workflow!.findOne(workflowId);
			if (workflowData === undefined) {
				GenericHelpers.logOutput(`The workflow with the id "${workflowId}" does not exist.`);
				return;
			}
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

		if (!WorkflowHelpers.isWorkflowIdValid(workflowId)) {
			workflowId = undefined;
		}

		// Check if the workflow contains the required "Start" node
		// "requiredNodeTypes" are also defined in editor-ui/views/NodeView.vue
		const requiredNodeTypes = ['n8n-nodes-base.start'];
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
			GenericHelpers.logOutput(`The workflow does not contain a "Start" node. So it can not be executed.`);
			return Promise.resolve();
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
				throw new Error('Workflow did not return any data!');
			}

			if (data.data.resultData.error) {
				this.log('Execution was NOT successfull:');
				this.log('====================================');
				this.log(JSON.stringify(data, null, 2));

				// console.log(data.data.resultData.error);
				const error = new Error(data.data.resultData.error.message);
				error.stack = data.data.resultData.error.stack;
				throw error;
			}

			this.log('Execution was successfull:');
			this.log('====================================');
			this.log(JSON.stringify(data, null, 2));
		} catch (e) {
			console.error('\nGOT ERROR');
			console.log('====================================');
			console.error(e.message);
			console.error(e.stack);
			this.exit(1);
			return;
		}

		this.exit();
	}
}
