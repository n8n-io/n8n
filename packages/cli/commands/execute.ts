import Vorpal = require('vorpal');
import { Args } from 'vorpal';
import { promises as fs } from 'fs';
import {
	ActiveExecutions,
	Db,
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
	UserSettings,
} from "n8n-core";


module.exports = (vorpal: Vorpal) => {
	return vorpal
		.command('execute')
		// @ts-ignore
		.description('Executes a given workflow')
		.option('--file <workflow-file>',
			'The path to a workflow file to execute')
		.option('--id <workflow-id>',
			'The id of the workflow to execute')
		.option('\n')
		// 	TODO: Add validation
		// .validate((args: Args) => {
		// })
		.action(async (args: Args) => {
			// Start directly with the init of the database to improve startup time
			const startDbInitPromise = Db.init();

			// Load all node and credential types
			const loadNodesAndCredentials = LoadNodesAndCredentials();
			const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();

			if (!args.options.id && !args.options.file) {
				GenericHelpers.logOutput(`Either option "--id" or "--file" have to be set!`);
				return Promise.resolve();
			}

			if (args.options.id && args.options.file) {
				GenericHelpers.logOutput(`Either "id" or "file" can be set never both!`);
				return Promise.resolve();
			}

			let workflowId: string | undefined;
			let workflowData: IWorkflowBase | undefined = undefined;
			if (args.options.file) {
				// Path to workflow is given
				try {
					workflowData = JSON.parse(await fs.readFile(args.options.file, 'utf8'));
				} catch (error) {
					if (error.code === 'ENOENT') {
						GenericHelpers.logOutput(`The file "${args.options.file}" could not be found.`);
						return;
					}

					throw error;
				}

				// Do a basic check if the data in the file looks right
				// TODO: Later check with the help of TypeScript data if it is valid or not
				if (workflowData === undefined || workflowData.nodes === undefined || workflowData.connections === undefined) {
					GenericHelpers.logOutput(`The file "${args.options.file}" does not contain valid workflow data.`);
					return;
				}
				workflowId = workflowData.id!.toString();
			}

			// Wait till the database is ready
			await startDbInitPromise;

			if (args.options.id) {
				// Id of workflow is given
				workflowId = args.options.id;
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

			// Add the found types to an instance other parts of the application can use
			const nodeTypes = NodeTypes();
			await nodeTypes.init(loadNodesAndCredentials.nodeTypes);

			if (!WorkflowHelpers.isWorkflowIdValid(workflowId)) {
				workflowId = undefined;
			}

			// Check if the workflow contains the required "Start" node
			// "requiredNodeTypes" are also defined in editor-ui/views/NodeView.vue
			const requiredNodeTypes = ['n8n-nodes-base.start'];
			let startNodeFound = false;
			for (const node of workflowData!.nodes) {
				if (requiredNodeTypes.includes(node.type)) {
					startNodeFound = true;
				}
			}

			if (startNodeFound === false) {
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
					workflowData: workflowData!,
				};

				const workflowRunner = new WorkflowRunner();
				const executionId = await workflowRunner.run(runData);

				const activeExecutions = ActiveExecutions.getInstance();
				const data = await activeExecutions.getPostExecutePromise(executionId);

				console.log('Execution was successfull:');
				console.log('====================================');
				console.log(JSON.stringify(data, null, 2));
			} catch (e) {
				console.error('GOT ERROR');
				console.log('====================================');
				console.error(e);
				return;
			}
		});
};
