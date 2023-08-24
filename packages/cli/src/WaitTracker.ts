import {
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	WorkflowOperationError,
} from 'n8n-workflow';
import { Container, Service } from 'typedi';
import type { FindManyOptions, ObjectLiteral } from '@n8n/typeorm';
import { Not, LessThanOrEqual } from '@n8n/typeorm';
import { DateUtils } from '@n8n/typeorm/util/DateUtils';

import config from '@/config';
import * as ResponseHelper from '@/ResponseHelper';
import type {
	IExecutionResponse,
	IExecutionsStopData,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import { WorkflowRunner } from '@/WorkflowRunner';
import { recoverExecutionDataFromEventLogMessages } from './eventbus/MessageEventBus/recoverEvents';
import { ExecutionRepository } from '@db/repositories';
import type { ExecutionEntity } from '@db/entities/ExecutionEntity';
import { OwnershipService } from './services/ownership.service';

@Service()
export class WaitTracker {
	private waitingExecutions: {
		[key: string]: {
			executionId: string;
			timer: NodeJS.Timeout;
		};
	} = {};

	mainTimer: NodeJS.Timeout;

	constructor(
		private executionRepository: ExecutionRepository,
		private ownershipService: OwnershipService,
	) {
		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 60000);

		void this.getWaitingExecutions();
	}

	async getWaitingExecutions() {
		Logger.debug('Wait tracker querying database for waiting executions');
		// Find all the executions which should be triggered in the next 70 seconds
		const findQuery: FindManyOptions<ExecutionEntity> = {
			select: ['id', 'waitTill'],
			where: {
				waitTill: LessThanOrEqual(new Date(Date.now() + 70000)),
				status: Not('crashed'),
			},
			order: {
				waitTill: 'ASC',
			},
		};

		const dbType = config.getEnv('database.type');
		if (dbType === 'sqlite') {
			// This is needed because of issue in TypeORM <> SQLite:
			// https://github.com/typeorm/typeorm/issues/2286
			(findQuery.where! as ObjectLiteral).waitTill = LessThanOrEqual(
				DateUtils.mixedDateToUtcDatetimeString(new Date(Date.now() + 70000)),
			);
		}

		const executions = await this.executionRepository.findMultipleExecutions(findQuery);

		if (executions.length === 0) {
			return;
		}

		const executionIds = executions.map((execution) => execution.id).join(', ');
		Logger.debug(
			`Wait tracker found ${executions.length} executions. Setting timer for IDs: ${executionIds}`,
		);

		// Add timers for each waiting execution that they get started at the correct time

		for (const execution of executions) {
			const executionId = execution.id;
			if (this.waitingExecutions[executionId] === undefined) {
				const triggerTime = execution.waitTill!.getTime() - new Date().getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						this.startExecution(executionId);
					}, triggerTime),
				};
			}
		}
	}

	async stopExecution(executionId: string): Promise<IExecutionsStopData> {
		if (this.waitingExecutions[executionId] !== undefined) {
			// The waiting execution was already scheduled to execute.
			// So stop timer and remove.
			clearTimeout(this.waitingExecutions[executionId].timer);
			delete this.waitingExecutions[executionId];
		}

		// Also check in database
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
		});

		if (!execution) {
			throw new Error(`The execution ID "${executionId}" could not be found.`);
		}

		if (!['new', 'unknown', 'waiting', 'running'].includes(execution.status)) {
			throw new Error(
				`Only running or waiting executions can be stopped and ${executionId} is currently ${execution.status}.`,
			);
		}
		let fullExecutionData: IExecutionResponse;
		try {
			fullExecutionData = ResponseHelper.unflattenExecutionData(execution);
		} catch (error) {
			// if the execution ended in an unforseen, non-cancelable state, try to recover it
			await recoverExecutionDataFromEventLogMessages(executionId, [], true);
			// find recovered data
			const restoredExecution = await Container.get(ExecutionRepository).findSingleExecution(
				executionId,
				{
					includeData: true,
					unflattenData: true,
				},
			);
			if (!restoredExecution) {
				throw new Error(`Execution ${executionId} could not be recovered or canceled.`);
			}
			fullExecutionData = restoredExecution;
		}
		// Set in execution in DB as failed and remove waitTill time
		const error = new WorkflowOperationError('Workflow-Execution has been canceled!');

		fullExecutionData.data.resultData.error = {
			...error,
			message: error.message,
			stack: error.stack,
		};

		fullExecutionData.stoppedAt = new Date();
		fullExecutionData.waitTill = null;
		fullExecutionData.status = 'canceled';

		await Container.get(ExecutionRepository).updateExistingExecution(
			executionId,
			fullExecutionData,
		);

		return {
			mode: fullExecutionData.mode,
			startedAt: new Date(fullExecutionData.startedAt),
			stoppedAt: fullExecutionData.stoppedAt ? new Date(fullExecutionData.stoppedAt) : undefined,
			finished: fullExecutionData.finished,
			status: fullExecutionData.status,
		};
	}

	startExecution(executionId: string) {
		Logger.debug(`Wait tracker resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		(async () => {
			// Get the data to execute
			const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			if (!fullExecutionData) {
				throw new Error(`The execution with the id "${executionId}" does not exist.`);
			}
			if (fullExecutionData.finished) {
				throw new Error('The execution did succeed and can so not be started again.');
			}

			if (!fullExecutionData.workflowData.id) {
				throw new Error('Only saved workflows can be resumed.');
			}
			const workflowId = fullExecutionData.workflowData.id;
			const user = await this.ownershipService.getWorkflowOwnerCached(workflowId);

			const data: IWorkflowExecutionDataProcess = {
				executionMode: fullExecutionData.mode,
				executionData: fullExecutionData.data,
				workflowData: fullExecutionData.workflowData,
				userId: user.id,
			};

			// Start the execution again
			const workflowRunner = new WorkflowRunner();
			await workflowRunner.run(data, false, false, executionId);
		})().catch((error: Error) => {
			ErrorReporter.error(error);
			Logger.error(
				`There was a problem starting the waiting execution with id "${executionId}": "${error.message}"`,
				{ executionId },
			);
		});
	}
}
