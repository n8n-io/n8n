import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import { UnexpectedError, type IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { DbClock } from '@/services/db-clock.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';
import {
	shouldRestartParentExecution,
	updateParentExecutionWithChildResults,
} from './workflow-helpers';

@Service()
export class WaitTracker {
	private waitingExecutions: {
		[key: string]: {
			executionId: string;
			timer: NodeJS.Timeout;
		};
	} = {};

	mainTimer: NodeJS.Timeout;

	/** Guards against overlapping poll invocations when DB queries take longer than the poll interval. */
	private isPolling = false;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly ownershipService: OwnershipService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbClock: DbClock,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = this.logger.scoped('waiting-executions');
	}

	has(executionId: string) {
		return this.waitingExecutions[executionId] !== undefined;
	}

	init() {
		if (this.instanceSettings.isLeader) this.startTracking();
	}

	@OnLeaderTakeover()
	private startTracking() {
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 5000);

		void this.getWaitingExecutions();

		this.logger.debug('Started tracking waiting executions');
	}

	async getWaitingExecutions() {
		if (this.isPolling) {
			this.logger.debug('Skipping poll — previous poll still in progress');
			return;
		}

		this.isPolling = true;
		try {
			const [executions, dbTime] = await Promise.all([
				this.executionRepository.getWaitingExecutions(),
				this.dbClock.getApproximateDbTime(),
			]);

			const skewMs = dbTime.getTime() - Date.now();
			if (Math.abs(skewMs) > 2000) {
				this.logger.warn(
					`Clock skew detected: this instance is ${Math.abs(skewMs)}ms ${skewMs > 0 ? 'behind' : 'ahead of'} the database server`,
				);
			}

			if (executions.length === 0) {
				return;
			}

			const newExecutions = executions.filter((e) => this.waitingExecutions[e.id] === undefined);

			if (newExecutions.length > 0) {
				const executionIds = newExecutions.map((e) => e.id).join(', ');
				this.logger.debug(
					`Found ${newExecutions.length} new waiting execution(s). Setting timer for IDs: ${executionIds}`,
				);
			}

			for (const execution of newExecutions) {
				const executionId = execution.id;
				if (execution.waitTill === null || execution.waitTill === undefined) {
					this.errorReporter.error(
						new UnexpectedError(
							'Polling returned an execution without waitTill — this should never happen',
							{ extra: { executionId } },
						),
						{ level: 'fatal' },
					);
					continue;
				}

				const triggerTime = execution.waitTill.getTime() - dbTime.getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(
						() => {
							void this.startExecution(executionId);
						},
						Math.max(triggerTime, 0),
					),
				};
			}
		} finally {
			this.isPolling = false;
		}
	}

	stopExecution(executionId: string) {
		if (!this.waitingExecutions[executionId]) return;

		clearTimeout(this.waitingExecutions[executionId].timer);

		delete this.waitingExecutions[executionId];
	}

	async startExecution(executionId: string) {
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });

		try {
			const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			if (!fullExecutionData) {
				throw new UnexpectedError('Execution does not exist.', { extra: { executionId } });
			}
			if (fullExecutionData.finished) {
				throw new UnexpectedError('The execution did succeed and can so not be started again.');
			}

			if (!fullExecutionData.workflowData.id) {
				throw new UnexpectedError('Only saved workflows can be resumed.');
			}

			const workflowId = fullExecutionData.workflowData.id;
			const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

			const data: IWorkflowExecutionDataProcess = {
				executionMode: fullExecutionData.mode,
				executionData: fullExecutionData.data,
				workflowData: fullExecutionData.workflowData,
				projectId: project.id,
				pushRef: fullExecutionData.data.pushRef,
				startedAt: fullExecutionData.startedAt,
			};

			try {
				await this.workflowRunner.run(data, false, false, executionId);
			} catch (error) {
				if (error instanceof ExecutionAlreadyResumingError) {
					this.logger.debug(
						`Execution ${executionId} is already being resumed, skipping duplicate resume`,
						{ executionId },
					);
					return;
				}
				throw error;
			}

			const { parentExecution } = fullExecutionData.data;
			if (shouldRestartParentExecution(parentExecution)) {
				void this.activeExecutions
					.getPostExecutePromise(executionId)
					.then(async (subworkflowResults) => {
						if (!subworkflowResults) return;
						if (subworkflowResults.status === 'waiting') return; // The child execution is waiting, not completing.
						await updateParentExecutionWithChildResults(
							this.executionRepository,
							parentExecution.executionId,
							subworkflowResults,
						);
						return subworkflowResults;
					})
					.then((subworkflowResults) => {
						if (!subworkflowResults) return;
						if (subworkflowResults.status === 'waiting') return; // The child execution is waiting, not completing.
						void this.startExecution(parentExecution.executionId);
					});
			}
		} finally {
			delete this.waitingExecutions[executionId];
		}
	}

	@OnLeaderStepdown()
	stopTracking() {
		if (!this.mainTimer) return;

		clearInterval(this.mainTimer);
		Object.keys(this.waitingExecutions).forEach((executionId) => {
			clearTimeout(this.waitingExecutions[executionId].timer);
		});

		this.logger.debug('Stopped tracking waiting executions');
	}
}
