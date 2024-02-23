import { Container } from 'typedi';
import { Flags } from '@oclif/core';
import { promises as fs } from 'fs';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { ApplicationError, ExecutionBaseError } from 'n8n-workflow';

import { ActiveExecutions } from '@/ActiveExecutions';
import { WorkflowRunner } from '@/WorkflowRunner';
import type { IWorkflowExecutionDataProcess } from '@/Interfaces';
import { findCliWorkflowStart, isWorkflowIdValid } from '@/utils';
import { BaseCommand } from './BaseCommand';

import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { OwnershipService } from '@/services/ownership.service';

export class Execute extends BaseCommand {
	static description = '\nExecutes a given workflow';

	static examples = ['$ n8n execute --id=5', '$ n8n execute --file=workflow.json'];

	static flags = {
		help: Flags.help({ char: 'h' }),
		file: Flags.string({
			description: 'path to a workflow file to execute',
		}),
		id: Flags.string({
			description: 'id of the workflow to execute',
		}),
		rawOutput: Flags.boolean({
			description: 'Outputs only JSON data, with no other text',
		}),
	};

	async init() {
		await super.init();
		await this.initBinaryDataService();
		await this.initExternalHooks();
	}

	async run() {
		const { flags } = await this.parse(Execute);

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
			if (workflowData?.nodes === undefined || workflowData.connections === undefined) {
				this.logger.info(`The file "${flags.file}" does not contain valid workflow data.`);
				return;
			}

			workflowId = workflowData.id ?? PLACEHOLDER_EMPTY_WORKFLOW_ID;
		}

		if (flags.id) {
			// Id of workflow is given
			workflowId = flags.id;
			workflowData = await Container.get(WorkflowRepository).findOneBy({ id: workflowId });
			if (workflowData === null) {
				this.logger.info(`The workflow with the id "${workflowId}" does not exist.`);
				process.exit(1);
			}
		}

		if (!workflowData) {
			throw new ApplicationError('Failed to retrieve workflow data for requested workflow');
		}

		if (!isWorkflowIdValid(workflowId)) {
			workflowId = undefined;
		}

		const startingNode = findCliWorkflowStart(workflowData.nodes);

		const user = await Container.get(OwnershipService).getInstanceOwner();
		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'cli',
			startNodes: [{ name: startingNode.name, sourceData: null }],
			workflowData,
			userId: user.id,
		};

		const executionId = await Container.get(WorkflowRunner).run(runData);

		const activeExecutions = Container.get(ActiveExecutions);
		const data = await activeExecutions.getPostExecutePromise(executionId);

		if (data === undefined) {
			throw new ApplicationError('Workflow did not return any data');
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
