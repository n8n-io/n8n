import { promises as fs } from 'fs';
import { flags } from '@oclif/command';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { ExecutionBaseError } from 'n8n-workflow';

import { ActiveExecutions } from '@/ActiveExecutions';
import * as Db from '@/Db';
import { WorkflowRunner } from '@/WorkflowRunner';
import type { IWorkflowExecutionDataProcess } from '@/Interfaces';
import { getInstanceOwner } from '@/UserManagement/UserManagementHelper';
import { findCliWorkflowStart, isWorkflowIdValid } from '@/utils';
import { initEvents } from '@/events';
import { BaseCommand } from './BaseCommand';
import { Container } from 'typedi';

export class Execute extends BaseCommand {
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

	async init() {
		await super.init();
		await this.initBinaryManager();
		await this.initExternalHooks();

		// Add event handlers
		initEvents();
	}

	async run() {
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(Execute);

		if (!flags.id && !flags.file) {
			this.logger.info('Either option "--id" or "--file" have to be set!');
			return;
		}

		if (flags.id && flags.file) {
			this.logger.info('Either "id" or "file" can be set never both!');
			return;
		}

		let workflowId: string | undefined;
		let workflowData: IWorkflowBase | null = null;
		if (flags.file) {
			// Path to workflow is given
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				workflowData = JSON.parse(await fs.readFile(flags.file, 'utf8'));
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (error.code === 'ENOENT') {
					this.logger.info(`The file "${flags.file}" could not be found.`);
					return;
				}

				throw error;
			}

			// Do a basic check if the data in the file looks right
			// TODO: Later check with the help of TypeScript data if it is valid or not
			if (
				workflowData === null ||
				workflowData.nodes === undefined ||
				workflowData.connections === undefined
			) {
				this.logger.info(`The file "${flags.file}" does not contain valid workflow data.`);
				return;
			}

			workflowId = workflowData.id ?? PLACEHOLDER_EMPTY_WORKFLOW_ID;
		}

		if (flags.id) {
			// Id of workflow is given
			workflowId = flags.id;
			workflowData = await Db.collections.Workflow.findOneBy({ id: workflowId });
			if (workflowData === null) {
				this.logger.info(`The workflow with the id "${workflowId}" does not exist.`);
				process.exit(1);
			}
		}

		if (!workflowData) {
			throw new Error('Failed to retrieve workflow data for requested workflow');
		}

		if (!isWorkflowIdValid(workflowId)) {
			workflowId = undefined;
		}

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

		const activeExecutions = Container.get(ActiveExecutions);
		const data = await activeExecutions.getPostExecutePromise(executionId);

		if (data === undefined) {
			throw new Error('Workflow did not return any data!');
		}

		if (data.data.resultData.error) {
			this.logger.info('Execution was NOT successful. See log message for details.');
			this.logger.info('Execution error:');
			this.logger.info('====================================');
			this.logger.info(JSON.stringify(data, null, 2));

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
	}

	async catch(error: Error) {
		this.logger.error('Error executing workflow. See log messages for details.');
		this.logger.error('\nExecution error:');
		this.logger.info('====================================');
		this.logger.error(error.message);
		if (error instanceof ExecutionBaseError) this.logger.error(error.description!);
		this.logger.error(error.stack!);
	}
}
