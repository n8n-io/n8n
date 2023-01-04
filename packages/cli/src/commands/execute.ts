/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { promises as fs } from 'fs';
import { Command, flags } from '@oclif/command';
import { BinaryDataManager, UserSettings, PLACEHOLDER_EMPTY_WORKFLOW_ID } from 'n8n-core';
import { LoggerProxy, IWorkflowBase } from 'n8n-workflow';

import * as ActiveExecutions from '@/ActiveExecutions';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import * as Db from '@/Db';
import { ExternalHooks } from '@/ExternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { InternalHooksManager } from '@/InternalHooksManager';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { WorkflowRunner } from '@/WorkflowRunner';
import { IWorkflowExecutionDataProcess } from '@/Interfaces';
import { getLogger } from '@/Logger';
import config from '@/config';
import { getInstanceOwner } from '@/UserManagement/UserManagementHelper';
import { findCliWorkflowStart } from '@/utils';

export class Execute extends Command {
	static description = '\nExecutes a given workflow';

	static examples = ['$ n8n execute --id=5', '$ n8n execute --file=workflow.json'];

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
		const binaryDataConfig = config.getEnv('binaryDataManager');
		await BinaryDataManager.init(binaryDataConfig, true);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Execute);

		// Start directly with the init of the database to improve startup time
		const startDbInitPromise = Db.init();

		// Load all node and credential types
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();

		if (!flags.id && !flags.file) {
			console.info('Either option "--id" or "--file" have to be set!');
			return;
		}

		if (flags.id && flags.file) {
			console.info('Either "id" or "file" can be set never both!');
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

			workflowId = workflowData.id ?? PLACEHOLDER_EMPTY_WORKFLOW_ID;
		}

		// Wait till the database is ready
		await startDbInitPromise;

		if (flags.id) {
			// Id of workflow is given
			workflowId = flags.id;
			workflowData = await Db.collections.Workflow.findOne(workflowId);
			if (workflowData === undefined) {
				console.info(`The workflow with the id "${workflowId}" does not exist.`);
				process.exit(1);
			}
		}

		if (!workflowData) {
			throw new Error('Failed to retrieve workflow data for requested workflow');
		}

		// Make sure the settings exist
		await UserSettings.prepareUserSettings();

		// Wait till the n8n-packages have been read
		await loadNodesAndCredentialsPromise;

		NodeTypes(loadNodesAndCredentials);
		const credentialTypes = CredentialTypes(loadNodesAndCredentials);

		// Load the credentials overwrites if any exist
		await CredentialsOverwrites(credentialTypes).init();

		// Load all external hooks
		const externalHooks = ExternalHooks();
		await externalHooks.init();

		// Add the found types to an instance other parts of the application can use
		const nodeTypes = NodeTypes(loadNodesAndCredentials);
		CredentialTypes(loadNodesAndCredentials);

		const instanceId = await UserSettings.getInstanceId();
		await InternalHooksManager.init(instanceId, nodeTypes);

		if (!WorkflowHelpers.isWorkflowIdValid(workflowId)) {
			workflowId = undefined;
		}

		try {
			const startingNode = findCliWorkflowStart(workflowData.nodes);

			const user = await getInstanceOwner();
			const runData: IWorkflowExecutionDataProcess = {
				executionMode: 'cli',
				startNodes: [startingNode.name],
				workflowData,
				userId: user.id,
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
			if (e.description) logger.error(e.description);
			logger.error(e.stack);
			this.exit(1);
		}

		this.exit();
	}
}
