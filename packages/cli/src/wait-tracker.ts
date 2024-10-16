import { InstanceSettings } from 'n8n-core';
import {
	ApplicationError,
	ErrorReporterProxy as ErrorReporter,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { Service } from 'typedi';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { Logger } from '@/logging/logger.service';
import { OrchestrationService } from '@/services/orchestration.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';

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
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly ownershipService: OwnershipService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly orchestrationService: OrchestrationService,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.withScope('executions');
	}

	has(executionId: string) {
		return this.waitingExecutions[executionId] !== undefined;
	}

	/**
	 * @important Requires `OrchestrationService` to be initialized.
	 */
	init() {
		const { isLeader } = this.instanceSettings;
		const { isMultiMainSetupEnabled } = this.orchestrationService;

		if (isLeader) this.startTracking();

		if (isMultiMainSetupEnabled) {
			this.orchestrationService.multiMainSetup
				.on('leader-takeover', () => this.startTracking())
				.on('leader-stepdown', () => this.stopTracking());
		}
	}

	private startTracking() {
		this.logger.debug('Started tracking waiting executions');

		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 60000);

		void this.getWaitingExecutions();
	}

	async getWaitingExecutions() {
		this.logger.debug('Querying database for waiting executions');

		const executions = await this.executionRepository.getWaitingExecutions();

		if (executions.length === 0) {
			return;
		}

		const executionIds = executions.map((execution) => execution.id).join(', ');
		this.logger.debug(
			`Found ${executions.length} executions. Setting timer for IDs: ${executionIds}`,
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

	stopExecution(executionId: string) {
		if (!this.waitingExecutions[executionId]) return;

		clearTimeout(this.waitingExecutions[executionId].timer);

		delete this.waitingExecutions[executionId];
	}

	startExecution(executionId: string) {
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		(async () => {
			// Get the data to execute
			const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			if (!fullExecutionData) {
				throw new ApplicationError('Execution does not exist.', { extra: { executionId } });
			}
			if (fullExecutionData.finished) {
				throw new ApplicationError('The execution did succeed and can so not be started again.');
			}

			if (!fullExecutionData.workflowData.id) {
				throw new ApplicationError('Only saved workflows can be resumed.');
			}
			const workflowId = fullExecutionData.workflowData.id;
			const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

			const data: IWorkflowExecutionDataProcess = {
				executionMode: fullExecutionData.mode,
				executionData: fullExecutionData.data,
				workflowData: fullExecutionData.workflowData,
				projectId: project.id,
			};

			// Start the execution again
			await this.workflowRunner.run(data, false, false, executionId);
		})().catch((error: Error) => {
			ErrorReporter.error(error);
			this.logger.error(
				`There was a problem starting the waiting execution with id "${executionId}": "${error.message}"`,
				{ executionId },
			);
		});
	}

	stopTracking() {
		this.logger.debug('Shutting down wait tracking');

		clearInterval(this.mainTimer);
		Object.keys(this.waitingExecutions).forEach((executionId) => {
			clearTimeout(this.waitingExecutions[executionId].timer);
		});
	}
}
