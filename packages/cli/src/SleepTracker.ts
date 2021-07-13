import {
	ActiveExecutions,
	Db,
	IExecutionFlattedDb,
	IWorkflowExecutionDataProcess,
	ResponseHelper,
	WorkflowCredentials,
	WorkflowRunner,
} from './';

import {
	LoggerProxy as Logger,
} from 'n8n-workflow';

import {
	FindManyOptions,
	LessThanOrEqual,
} from 'typeorm';

import { DateUtils } from 'typeorm/util/DateUtils';


export class SleepTracker {
	activeExecutionsInstance: ActiveExecutions.ActiveExecutions;

	private sleepingExecutions: {
		[key: string]: {
			executionId: string,
			timer: NodeJS.Timeout,
		};
	} = {};

	mainTimer: NodeJS.Timeout;


	constructor() {
		// TODO: Implement and test for/with other databases
		// TODO: Make it possible to select "waiting" executions in Execution List
		// TODO: Think about security. Is it OK that people can restart an execution by knowing (or guessing) the execution-ID?
		// TODO: Think about how to best mark an execution waiting for a webhook in DB (currently also uses time)
		// TODO: Allow to set time to continue (absolute & relative) in webhook-mode so that it goes on if no webhook is received (separate output?)

		// Example URL:
		// http://localhost:5678/webhook-sleeping/13485

		this.activeExecutionsInstance = ActiveExecutions.getInstance();

		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			this.getSleepingExecutions();
		}, 60000);

		this.getSleepingExecutions();
	}


	async getSleepingExecutions() {
		Logger.debug('Sleep tracker querying database for sleeping executions...');
		// Find all the executions which should be triggered in the next 70 seconds
		const findQuery: FindManyOptions<IExecutionFlattedDb> = {
			select: ['id', 'sleepTill'],
			where: {
				// This is needed because of issue in TypeORM <> SQLite:
				// https://github.com/typeorm/typeorm/issues/2286
				// TODO: Check if this causes problems with other databases
				sleepTill: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date(Date.now() + 70000))),
			},
			order: {
				sleepTill: 'ASC',
			},
		};

		const executions = await Db.collections.Execution!.find(findQuery);

		if (executions.length > 0) {
			const executionIds = executions.map(execution => execution.id.toString()).join(', ');
			Logger.debug(`Sleep tracker found ${executions.length} executions. Setting timer for IDs: ${executionIds}`);
		}
		
		// Add timers for each waiting execution that they get started at the correct time
		for (const execution of executions) {
			const executionId = execution.id.toString();
			if (this.sleepingExecutions[executionId] === undefined) {
				const triggerTime = execution.sleepTill!.getTime() - new Date().getTime();
				this.sleepingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						this.startExecution(executionId);
					}, triggerTime),
				};
			}
		}
	}


	startExecution(executionId: string) {
		Logger.debug(`Sleep tracker resuming execution ${executionId}`, {executionId});
		delete this.sleepingExecutions[executionId];

		(async () => {
			try {
				// Get the data to execute
				const fullExecutionDataFlatted = await Db.collections.Execution!.findOne(executionId);

				if (fullExecutionDataFlatted === undefined) {
					throw new Error(`The execution with the id "${executionId}" does not exist.`);
				}

				const fullExecutionData = ResponseHelper.unflattenExecutionData(fullExecutionDataFlatted);

				if (fullExecutionData.finished === true) {
					throw new Error('The execution did succeed and can so not be started again.');
				}

				const credentials = await WorkflowCredentials(fullExecutionData.workflowData.nodes);

				const data: IWorkflowExecutionDataProcess = {
					credentials,
					executionMode: fullExecutionData.mode,
					executionData: fullExecutionData.data,
					workflowData: fullExecutionData.workflowData,
				};

				// Start the execution again
				const workflowRunner = new WorkflowRunner();
				await workflowRunner.run(data, false, false, executionId);
			} catch (error) {
				Logger.error(`There was a problem starting the sleeping execution with id "${executionId}": "${error.message}"`, { executionId });
			}

		})();

	}
}
