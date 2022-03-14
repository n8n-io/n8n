/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { promises as fs } from 'fs';
import { Command, flags } from '@oclif/command';
import {
	BinaryDataManager,
	IBinaryDataConfig,
	UserSettings,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
} from 'n8n-core';
import { INode, LoggerProxy } from 'n8n-workflow';

import {
	ActiveExecutions,
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	GenericHelpers,
	InternalHooksManager,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	LoadNodesAndCredentials,
	NodeTypes,
	WorkflowHelpers,
	WorkflowRunner,
} from '../src';

import { getLogger } from '../src/Logger';
import config = require('../config');

export class Execute extends Command {
	static description = '\nExecutes a given workflow';

	static examples = [`$ n8n execute --id=5`, `$ n8n execute --file=workflow.json`];

	static flags = {
		help: flags.help({ char: 'h' }),
		file: flags.string({
			description: 'path to a workflow file to execute',
		}),
		id: flags.string({
			description: 'id of the workflow to execute',
		}),
		rawOutput: flags.boolean({
			description: 'Outputs only JSON data, with no other text',
		}),
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);
		const binaryDataConfig = config.get('binaryDataManager') as IBinaryDataConfig;
		await BinaryDataManager.init(binaryDataConfig, true);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Execute);

		// Start directly with the init of the database to improve startup time
		const startDbInitPromise = Db.init();

		// Load all node and credential types
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();

		if (!flags.id && !flags.file) {
			console.info(`Either option "--id" or "--file" have to be set!`);
			return;
		}

		if (flags.id && flags.file) {
			console.info(`Either "id" or "file" can be set never both!`);
			return;
		}

		let workflowId: string | undefined;
		let workflowData: IWorkflowBase | undefined;
		if (flags.file) {
			// Path to workflow is given
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				workflowData = JSON.parse(await fs.readFile(flags.file, 'utf8'));
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (error.code === 'ENOENT') {
					console.info(`The file "${flags.file}" could not be found.`);
					return;
				}

				throw error;
			}

			// Do a basic check if the data in the file looks right
			// TODO: Later check with the help of TypeScript data if it is valid or not
			if (
				workflowData === undefined ||
				workflowData.nodes === undefined ||
				workflowData.connections === undefined
			) {
				console.info(`The file "${flags.file}" does not contain valid workflow data.`);
				return;
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			workflowId = workflowData.id ? workflowData.id.toString() : PLACEHOLDER_EMPTY_WORKFLOW_ID;
		}

		// Wait till the database is ready
		await startDbInitPromise;

		if (flags.id) {
			// Id of workflow is given
			workflowId = flags.id;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			workflowData = await Db.collections.Workflow!.findOne(workflowId);
			if (workflowData === undefined) {
				console.info(`The workflow with the id "${workflowId}" does not exist.`);
				process.exit(1);
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
		const credentialTypes = CredentialTypes();
		await credentialTypes.init(loadNodesAndCredentials.credentialTypes);

		const instanceId = await UserSettings.getInstanceId();
		const { cli } = await GenericHelpers.getVersions();
		InternalHooksManager.init(instanceId, cli, nodeTypes);

		if (!WorkflowHelpers.isWorkflowIdValid(workflowId)) {
			workflowId = undefined;
		}

		// Check if the workflow contains the required "Start" node
		// "requiredNodeTypes" are also defined in editor-ui/views/NodeView.vue
		const requiredNodeTypes = ['n8n-nodes-base.start'];
		let startNode: INode | undefined;
		// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-non-null-assertion
		for (const node of workflowData!.nodes) {
			if (requiredNodeTypes.includes(node.type)) {
				startNode = node;
				break;
			}
		}

		if (startNode === undefined) {
			// If the workflow does not contain a start-node we can not know what
			// should be executed and with which data to start.
			console.info(`The workflow does not contain a "Start" node. So it can not be executed.`);
			// eslint-disable-next-line consistent-return
			return Promise.resolve();
		}

		try {
			const runData: IWorkflowExecutionDataProcess = {
				executionMode: 'cli',
				startNodes: [startNode.name],
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
				console.info('Execution was NOT successful. See log message for details.');
				logger.info('Execution error:');
				logger.info('====================================');
				logger.info(JSON.stringify(data, null, 2));

				const { error } = data.data.resultData;
				// eslint-disable-next-line @typescript-eslint/no-throw-literal
				throw {
					...error,
					stack: error.stack,
				};
			}
			if (flags.rawOutput === undefined) {
				this.log('Execution was successful:');
				this.log('====================================');
			}
			this.log(JSON.stringify(data, null, 2));
		} catch (e) {
			console.error('Error executing workflow. See log messages for details.');
			logger.error('\nExecution error:');
			logger.info('====================================');
			logger.error(e.message);
			logger.error(e.stack);
			this.exit(1);
		}

		this.exit();
	}
}
