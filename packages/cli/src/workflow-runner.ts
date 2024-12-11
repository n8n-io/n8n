/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ErrorReporter, InstanceSettings, WorkflowExecute } from 'n8n-core';
import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IPinData,
	IRun,
	WorkflowExecuteMode,
	WorkflowHooks,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { ExecutionCancelledError, Workflow } from 'n8n-workflow';
import PCancelable from 'p-cancelable';
import { Container, Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExternalHooks } from '@/external-hooks';
import { Logger } from '@/logging/logger.service';
import { NodeTypes } from '@/node-types';
import type { ScalingService } from '@/scaling/scaling.service';
import type { Job, JobData } from '@/scaling/scaling.types';
import { PermissionChecker } from '@/user-management/permission-checker';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { generateFailedExecutionFromError } from '@/workflow-helpers';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { ExecutionNotFoundError } from './errors/execution-not-found-error';
import { EventService } from './events/event.service';
import { ManualExecutionService } from './manual-execution.service';

@Service()
export class WorkflowRunner {
	private scalingService: ScalingService;

	private executionsMode = config.getEnv('executions.mode');

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly externalHooks: ExternalHooks,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly nodeTypes: NodeTypes,
		private readonly permissionChecker: PermissionChecker,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
		private readonly manualExecutionService: ManualExecutionService,
	) {}

	/** The process did error */
	async processError(
		error: ExecutionError | ExecutionNotFoundError,
		startedAt: Date,
		executionMode: WorkflowExecuteMode,
		executionId: string,
		hooks?: WorkflowHooks,
	) {
		// This means the execution was probably cancelled and has already
		// been cleaned up.
		//
		// FIXME: This is a quick fix. The proper fix would be to not remove
		// the execution from the active executions while it's still running.
		if (error instanceof ExecutionNotFoundError) {
			return;
		}

		this.errorReporter.error(error, { executionId });

		const isQueueMode = config.getEnv('executions.mode') === 'queue';

		// in queue mode, first do a sanity run for the edge case that the execution was not marked as stalled
		// by Bull even though it executed successfully, see https://github.com/OptimalBits/bull/issues/1415

		if (isQueueMode && executionMode !== 'manual') {
			const executionWithoutData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: false,
			});
			if (executionWithoutData?.finished === true && executionWithoutData?.status === 'success') {
				// false positive, execution was successful
				return;
			}
		}

		const fullRunData: IRun = {
			data: {
				resultData: {
					error: {
						...error,
						message: error.message,
						stack: error.stack,
					},
					runData: {},
				},
			},
			finished: false,
			mode: executionMode,
			startedAt,
			stoppedAt: new Date(),
			status: 'error',
		};

		// Remove from active execution with empty data. That will
		// set the execution to failed.
		this.activeExecutions.finalizeExecution(executionId, fullRunData);

		if (hooks) {
			await hooks.executeHookFunctions('workflowExecuteAfter', [fullRunData]);
		}
	}

	/** Run the workflow
	 * @param realtime This is used in queue mode to change the priority of an execution, making sure they are picked up quicker.
	 */
	async run(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
		restartExecutionId?: string,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string> {
		// Register a new execution
		const executionId = await this.activeExecutions.add(data, restartExecutionId);

		const { id: workflowId, nodes } = data.workflowData;
		try {
			await this.permissionChecker.check(workflowId, nodes);
		} catch (error) {
			// Create a failed execution with the data for the node, save it and abort execution
			const runData = generateFailedExecutionFromError(data.executionMode, error, error.node);
			const workflowHooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);
			await workflowHooks.executeHookFunctions('workflowExecuteBefore', [
				undefined,
				data.executionData,
			]);
			await workflowHooks.executeHookFunctions('workflowExecuteAfter', [runData]);
			responsePromise?.reject(error);
			this.activeExecutions.finalizeExecution(executionId);
			return executionId;
		}

		if (responsePromise) {
			this.activeExecutions.attachResponsePromise(executionId, responsePromise);
		}

		if (this.executionsMode === 'queue' && data.executionMode !== 'manual') {
			// Do not run "manual" executions in bull because sending events to the
			// frontend would not be possible
			await this.enqueueExecution(executionId, data, loadStaticData, realtime);
		} else {
			await this.runMainProcess(executionId, data, loadStaticData, restartExecutionId);
			this.eventService.emit('workflow-pre-execute', { executionId, data });
		}

		// only run these when not in queue mode or when the execution is manual,
		// since these calls are now done by the worker directly
		if (
			this.executionsMode !== 'queue' ||
			this.instanceSettings.instanceType === 'worker' ||
			data.executionMode === 'manual'
		) {
			const postExecutePromise = this.activeExecutions.getPostExecutePromise(executionId);
			postExecutePromise
				.then(async (executionData) => {
					this.eventService.emit('workflow-post-execute', {
						workflow: data.workflowData,
						executionId,
						userId: data.userId,
						runData: executionData,
					});
					if (this.externalHooks.exists('workflow.postExecute')) {
						try {
							await this.externalHooks.run('workflow.postExecute', [
								executionData,
								data.workflowData,
								executionId,
							]);
						} catch (error) {
							this.errorReporter.error(error);
							this.logger.error('There was a problem running hook "workflow.postExecute"', error);
						}
					}
				})
				.catch((error) => {
					if (error instanceof ExecutionCancelledError) return;
					this.errorReporter.error(error);
					this.logger.error(
						'There was a problem running internal hook "onWorkflowPostExecute"',
						error,
					);
				});
		}

		return executionId;
	}

	/** Run the workflow in current process */
	// eslint-disable-next-line complexity
	private async runMainProcess(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		restartExecutionId?: string,
	): Promise<void> {
		const workflowId = data.workflowData.id;
		if (loadStaticData === true && workflowId) {
			data.workflowData.staticData =
				await this.workflowStaticDataService.getStaticDataById(workflowId);
		}

		// Soft timeout to stop workflow execution after current running node
		// Changes were made by adding the `workflowTimeout` to the `additionalData`
		// So that the timeout will also work for executions with nested workflows.
		let executionTimeout: NodeJS.Timeout;

		const workflowSettings = data.workflowData.settings ?? {};
		let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout'); // initialize with default
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
		}

		let pinData: IPinData | undefined;
		if (data.executionMode === 'manual') {
			pinData = data.pinData ?? data.workflowData.pinData;
		}

		const workflow = new Workflow({
			id: workflowId,
			name: data.workflowData.name,
			nodes: data.workflowData.nodes,
			connections: data.workflowData.connections,
			active: data.workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: data.workflowData.staticData,
			settings: workflowSettings,
			pinData,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			data.userId,
			undefined,
			workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
		);
		// TODO: set this in queue mode as well
		additionalData.restartExecutionId = restartExecutionId;

		additionalData.executionId = executionId;

		this.logger.debug(
			`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
			{ executionId },
		);
		let workflowExecution: PCancelable<IRun>;
		await this.executionRepository.setRunning(executionId); // write

		try {
			additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);

			additionalData.hooks.hookFunctions.sendResponse = [
				async (response: IExecuteResponsePromiseData): Promise<void> => {
					this.activeExecutions.resolveResponsePromise(executionId, response);
				},
			];

			additionalData.setExecutionStatus = WorkflowExecuteAdditionalData.setExecutionStatus.bind({
				executionId,
			});

			additionalData.sendDataToUI = WorkflowExecuteAdditionalData.sendDataToUI.bind({
				pushRef: data.pushRef,
			});

			if (data.executionData !== undefined) {
				this.logger.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, {
					executionId,
				});
				const workflowExecute = new WorkflowExecute(
					additionalData,
					data.executionMode,
					data.executionData,
				);
				workflowExecution = workflowExecute.processRunExecutionData(workflow);
			} else {
				workflowExecution = this.manualExecutionService.runManually(
					data,
					workflow,
					additionalData,
					executionId,
					pinData,
				);
			}

			this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);

			if (workflowTimeout > 0) {
				const timeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout')) * 1000; // as seconds
				executionTimeout = setTimeout(() => {
					void this.activeExecutions.stopExecution(executionId);
				}, timeout);
			}

			workflowExecution
				.then((fullRunData) => {
					clearTimeout(executionTimeout);
					if (workflowExecution.isCanceled) {
						fullRunData.finished = false;
					}
					fullRunData.status = this.activeExecutions.getStatus(executionId);
					this.activeExecutions.finalizeExecution(executionId, fullRunData);
				})
				.catch(
					async (error) =>
						await this.processError(
							error,
							new Date(),
							data.executionMode,
							executionId,
							additionalData.hooks,
						),
				);
		} catch (error) {
			await this.processError(
				error,
				new Date(),
				data.executionMode,
				executionId,
				additionalData.hooks,
			);

			throw error;
		}
	}

	private async enqueueExecution(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
	): Promise<void> {
		const jobData: JobData = {
			executionId,
			loadStaticData: !!loadStaticData,
		};

		if (!this.scalingService) {
			const { ScalingService } = await import('@/scaling/scaling.service');
			this.scalingService = Container.get(ScalingService);
		}

		// TODO: For realtime jobs should probably also not do retry or not retry if they are older than x seconds.
		//       Check if they get retried by default and how often.
		let job: Job;
		let hooks: WorkflowHooks;
		try {
			job = await this.scalingService.addJob(jobData, { priority: realtime ? 50 : 100 });

			hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerMain(
				data.executionMode,
				executionId,
				data.workflowData,
				{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
			);

			// Normally also workflow should be supplied here but as it only used for sending
			// data to editor-UI is not needed.
			await hooks.executeHookFunctions('workflowExecuteBefore', [undefined, data.executionData]);
		} catch (error) {
			// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
			// "workflowExecuteAfter" which we require.
			const hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
				data.executionMode,
				executionId,
				data.workflowData,
				{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
			);
			await this.processError(error, new Date(), data.executionMode, executionId, hooks);
			throw error;
		}

		const workflowExecution: PCancelable<IRun> = new PCancelable(
			async (resolve, reject, onCancel) => {
				onCancel.shouldReject = false;
				onCancel(async () => {
					await this.scalingService.stopJob(job);

					// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooksWorker = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
						data.executionMode,
						executionId,
						data.workflowData,
						{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
					);

					const error = new ExecutionCancelledError(executionId);
					await this.processError(error, new Date(), data.executionMode, executionId, hooksWorker);

					reject(error);
				});

				try {
					await job.finished();
				} catch (error) {
					// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
						data.executionMode,
						executionId,
						data.workflowData,
						{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
					);
					this.logger.error(`Problem with execution ${executionId}: ${error.message}. Aborting.`);
					await this.processError(error, new Date(), data.executionMode, executionId, hooks);

					reject(error);
				}

				const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
					includeData: true,
					unflattenData: true,
				});
				if (!fullExecutionData) {
					return reject(new Error(`Could not find execution with id "${executionId}"`));
				}

				const runData: IRun = {
					finished: fullExecutionData.finished,
					mode: fullExecutionData.mode,
					startedAt: fullExecutionData.startedAt,
					stoppedAt: fullExecutionData.stoppedAt,
					status: fullExecutionData.status,
					data: fullExecutionData.data,
				};

				this.activeExecutions.finalizeExecution(executionId, runData);

				// Normally also static data should be supplied here but as it only used for sending
				// data to editor-UI is not needed.
				await hooks.executeHookFunctions('workflowExecuteAfter', [runData]);

				resolve(runData);
			},
		);

		workflowExecution.catch(() => {
			// We `reject` this promise if the execution fails
			// but the error is handled already by processError
			// So we're just preventing crashes here.
		});

		this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
	}
}
