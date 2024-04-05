import { Container } from 'typedi';
import { Flags } from '@oclif/core';
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

	static examples = ['$ n8n execute --id=5'];

	static flags = {
		help: Flags.help({ char: 'h' }),
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

		if (!flags.id) {
			this.logger.info('"--id" has to be set!');
			return;
		}

		if (flags.file) {
			throw new ApplicationError(
				'The --file flag is no longer supported. Please first import the workflow and then execute it using the --id flag.',
				{ level: 'warning' },
			);
		}

		let workflowId: string | undefined;
		let workflowData: IWorkflowBase | null = null;

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
