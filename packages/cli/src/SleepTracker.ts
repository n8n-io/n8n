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
		// TODO: Check with different modes: own, main, queue (basic tests done for "own" & "main", for "queue" not implemented at all)
		// TODO: Do proper testing
		// TODO: Make it possible to select "waiting" executions in Execution List
		// TODO: Display correct URL in wait-node (will probably be only placeholder one as execution-ID will be unknown)
		// TODO: Think about security. Is it OK that people can restart an execution by knowing (or guessing) the execution-ID?
		// TODO: Think about how to best mark an execution waiting for a webhook in DB (currently also uses time)
		// TODO: Display sleeping URL information on wait-node so that people know how to retrieve it
		// TODO: Allow to set time to continue (absolute & relative) in webhook-mode so that it goes on if no webhook is received (separate output?)

		// Example URL:
		// http://localhost:5678/webhook-sleeping/13485

		this.activeExecutionsInstance = ActiveExecutions.getInstance();

		// Gell all 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			this.getSleepingExecutions();
		}, 60000);

		this.getSleepingExecutions();
	}


	async getSleepingExecutions() {
		// Find all the executions which should be triggered in the next 70 seconds
		const findQuery: FindManyOptions<IExecutionFlattedDb> = {
			select: ['id', 'sleepTill'],
			where: {
				// This is needed because of issue in TypeORM <> SQLite:
				// https://github.com/typeorm/typeorm/issues/2286
				sleepTill: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date(Date.now() + 70000))),
			},
			order: {
				sleepTill: 'ASC',
			},
		};

		const executions = await Db.collections.Execution!.find(findQuery);

		// Add timers for each waiting execution that they get started at the correct time
		for (const execution of executions) {
			const executionId = execution.id.toString();

			const triggerTime = execution.sleepTill!.getTime() - new Date().getTime();

			this.sleepingExecutions[executionId] = {
				executionId,
				timer: setTimeout(() => {
					this.startExecution(executionId);
				}, triggerTime),
			};
		}
	}


	startExecution(executionId: string) {
		delete this.sleepingExecutions[executionId];

		(async () => {
			try {
				// Get the data to execute
				const fullExecutionDataFlatted = await Db.collections.Execution!.findOne(executionId);

				if (fullExecutionDataFlatted === undefined) {
					throw new ResponseHelper.ResponseError(`The execution with the id "${executionId}" does not exist.`, 404, 404);
				}

				const fullExecutionData = ResponseHelper.unflattenExecutionData(fullExecutionDataFlatted);

				if (fullExecutionData.finished === true) {
					throw new Error('The execution did succeed and can so not be started again.');
				}

				const lastNodeExecuted = fullExecutionData!.data.resultData.lastNodeExecuted as string;

				// Set the node as disabled so that the data does not get executed again as it would result
				// in starting the sleep all over again
				fullExecutionData!.data.executionData!.nodeExecutionStack[0].node.disabled = true;

				// Remove sleepTill information else the execution would stop
				fullExecutionData!.data.sleepTill = undefined;

				// Remove the data of the node execution again else it will display the node as executed twice
				fullExecutionData!.data.resultData.runData[lastNodeExecuted].pop();

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
