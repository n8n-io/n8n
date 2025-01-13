/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Container, Service } from '@n8n/di';
import type { ExecutionHooks } from 'n8n-core';
import { ErrorReporter, InstanceSettings, Logger, WorkflowExecute } from 'n8n-core';
import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IPinData,
	IRun,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
	IWorkflowExecuteAdditionalData,
	ExecuteWorkflowOptions,
	IWorkflowBase,
	ExecuteWorkflowData,
} from 'n8n-workflow';
import { ExecutionCancelledError, Workflow } from 'n8n-workflow';
import PCancelable from 'p-cancelable';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { EventService } from '@/events/event.service';
import { ExecutionHooksFactory } from '@/execution-lifecycle-hooks/execution-hooks-factory';
import { ExternalHooks } from '@/external-hooks';
import type { UpdateExecutionPayload } from '@/interfaces';
import { ManualExecutionService } from '@/manual-execution.service';
import { NodeTypes } from '@/node-types';
import type { ScalingService } from '@/scaling/scaling.service';
import type { Job, JobData } from '@/scaling/scaling.types';
import { SubworkflowPolicyChecker } from '@/subworkflows/subworkflow-policy-checker.service';
import { PermissionChecker } from '@/user-management/permission-checker';
import { objectToError } from '@/utils/object-to-error';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { generateFailedExecutionFromError, getDataLastExecutedNodeData } from '@/workflow-helpers';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

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
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
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
		hooks?: ExecutionHooks,
	) {
		// This means the execution was probably cancelled and has already
		// been cleaned up.
		//
		// FIXME: This is a quick fix. The proper fix would be to not remove
		// the execution from the active executions while it's still running.
		if (
			error instanceof ExecutionNotFoundError ||
			error instanceof ExecutionCancelledError ||
			error.message.includes('cancelled')
		) {
			return;
		}

		this.logger.error(`Problem with execution ${executionId}: ${error.message}. Aborting.`);
		this.errorReporter.error(error, { executionId });

		const isQueueMode = config.getEnv('executions.mode') === 'queue';

		// in queue mode, first do a sanity run for the edge case that the execution was not marked as stalled
		// by Bull even though it executed successfully, see https://github.com/OptimalBits/bull/issues/1415

		if (isQueueMode) {
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

		await hooks?.executeHook('workflowExecuteAfter', [fullRunData]);
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
			const executionHooksFactory = Container.get(ExecutionHooksFactory);
			// Create a failed execution with the data for the node, save it and abort execution
			const runData = generateFailedExecutionFromError(data.executionMode, error, error.node);
			const hooks = executionHooksFactory.forExecutionOnMain(data, executionId);
			await hooks.executeHook('workflowExecuteBefore', [undefined, data.executionData]);
			await hooks.executeHook('workflowExecuteAfter', [runData]);
			responsePromise?.reject(error);
			this.activeExecutions.finalizeExecution(executionId);
			return executionId;
		}

		if (responsePromise) {
			this.activeExecutions.attachResponsePromise(executionId, responsePromise);
		}

		// @TODO: Reduce to true branch once feature is stable
		const shouldEnqueue =
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true'
				? this.executionsMode === 'queue'
				: this.executionsMode === 'queue' && data.executionMode !== 'manual';

		if (shouldEnqueue) {
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
		if (['manual', 'evaluation'].includes(data.executionMode)) {
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
			const executionHooksFactory = Container.get(ExecutionHooksFactory);
			additionalData.hooks = executionHooksFactory.forExecutionOnMain(data, executionId);

			additionalData.hooks.addHook('sendResponse', async (response) => {
				this.activeExecutions.resolveResponsePromise(executionId, response);
			});

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
			pushRef: data.pushRef,
		};

		if (!this.scalingService) {
			const { ScalingService } = await import('@/scaling/scaling.service');
			this.scalingService = Container.get(ScalingService);
		}

		const executionHooksFactory = Container.get(ExecutionHooksFactory);
		// TODO: For realtime jobs should probably also not do retry or not retry if they are older than x seconds.
		//       Check if they get retried by default and how often.
		let job: Job;
		let lifecycleHooks: ExecutionHooks;
		try {
			job = await this.scalingService.addJob(jobData, { priority: realtime ? 50 : 100 });

			lifecycleHooks = executionHooksFactory.forExecutionOnWorker(
				data.executionMode,
				executionId,
				data.workflowData,
				{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
			);

			// Normally also workflow should be supplied here but as it only used for sending
			// data to editor-UI is not needed.
			await lifecycleHooks.executeHook('workflowExecuteBefore', [undefined, data.executionData]);
		} catch (error) {
			// We use "getWorkflowHooksWorkerExecuter" as "getLifecycleHooksForWorkerMain" does not contain the
			// "workflowExecuteAfter" which we require.
			const hooks = executionHooksFactory.forExecutionOnWorker(
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

					// We use "getWorkflowHooksWorkerExecuter" as "getLifecycleHooksForWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooksWorker = executionHooksFactory.forExecutionOnWorker(
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
					// We use "getWorkflowHooksWorkerExecuter" as "getLifecycleHooksForWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooks = executionHooksFactory.forExecutionOnWorker(
						data.executionMode,
						executionId,
						data.workflowData,
						{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
					);
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
				await lifecycleHooks.executeHook('workflowExecuteAfter', [runData]);

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

	async runSubWorkflow(
		additionalData: IWorkflowExecuteAdditionalData,
		options: ExecuteWorkflowOptions,
		executionId: string,
		runData: IWorkflowExecutionDataProcess,
		workflowData: IWorkflowBase,
	): Promise<ExecuteWorkflowData> {
		const { activeExecutions, externalHooks, eventService, executionRepository, nodeTypes } = this;

		await externalHooks.init();

		const workflowName = workflowData ? workflowData.name : undefined;
		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowName,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		/**
		 * A subworkflow execution in queue mode is not enqueued, but rather runs in the
		 * same worker process as the parent execution. Hence ensure the subworkflow
		 * execution is marked as started as well.
		 */
		await executionRepository.setRunning(executionId);

		eventService.emit('workflow-pre-execute', { executionId, data: runData });

		let data;
		try {
			await this.permissionChecker.check(workflowData.id, workflowData.nodes);
			await this.subworkflowPolicyChecker.check(
				workflow,
				options.parentWorkflowId,
				options.node,
				additionalData.userId,
			);

			const executionHooksFactory = Container.get(ExecutionHooksFactory);

			// Create new additionalData to have different workflow loaded and to call
			// different webhooks
			const additionalDataIntegrated = await WorkflowExecuteAdditionalData.getBase();
			additionalDataIntegrated.hooks = executionHooksFactory.forSubExecution(
				runData.executionMode,
				executionId,
				workflowData,
				{ pushRef: runData.pushRef, retryOf: runData.retryOf },
			);
			additionalDataIntegrated.executionId = executionId;
			additionalDataIntegrated.parentCallbackManager = options.parentCallbackManager;

			// Make sure we pass on the original executeWorkflow function we received
			// This one already contains changes to talk to parent process
			// and get executionID from `activeExecutions` running on main process
			additionalDataIntegrated.executeSubWorkflow = additionalData.executeSubWorkflow;

			let subworkflowTimeout = additionalData.executionTimeoutTimestamp;
			const workflowSettings = workflowData.settings;
			if (
				workflowSettings?.executionTimeout !== undefined &&
				workflowSettings.executionTimeout > 0
			) {
				// We might have received a max timeout timestamp from the parent workflow
				// If we did, then we get the minimum time between the two timeouts
				// If no timeout was given from the parent, then we use our timeout.
				subworkflowTimeout = Math.min(
					additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER,
					Date.now() + workflowSettings.executionTimeout * 1000,
				);
			}

			additionalDataIntegrated.executionTimeoutTimestamp = subworkflowTimeout;

			// Execute the workflow
			const workflowExecute = new WorkflowExecute(
				additionalDataIntegrated,
				runData.executionMode,
				runData.executionData,
			);
			const execution = workflowExecute.processRunExecutionData(workflow);
			activeExecutions.attachWorkflowExecution(executionId, execution);
			data = await execution;
		} catch (error) {
			const executionError = error ? (error as ExecutionError) : undefined;
			const fullRunData: IRun = {
				data: {
					resultData: {
						error: executionError,
						runData: {},
					},
				},
				finished: false,
				mode: 'integrated',
				startedAt: new Date(),
				stoppedAt: new Date(),
				status: 'error',
			};
			// When failing, we might not have finished the execution
			// Therefore, database might not contain finished errors.
			// Force an update to db as there should be no harm doing this

			const fullExecutionData: UpdateExecutionPayload = {
				data: fullRunData.data,
				mode: fullRunData.mode,
				finished: fullRunData.finished ? fullRunData.finished : false,
				startedAt: fullRunData.startedAt,
				stoppedAt: fullRunData.stoppedAt,
				status: fullRunData.status,
				workflowData,
				workflowId: workflowData.id,
			};
			if (workflowData.id) {
				fullExecutionData.workflowId = workflowData.id;
			}

			activeExecutions.finalizeExecution(executionId, fullRunData);

			await executionRepository.updateExistingExecution(executionId, fullExecutionData);
			throw objectToError(
				{
					...executionError,
					stack: executionError?.stack,
					message: executionError?.message,
				},
				workflow,
			);
		}

		await this.externalHooks.run('workflow.postExecute', [data, workflowData, executionId]);

		eventService.emit('workflow-post-execute', {
			workflow: workflowData,
			executionId,
			userId: additionalData.userId,
			runData: data,
		});

		// subworkflow either finished, or is in status waiting due to a wait node, both cases are considered successes here
		if (data.finished === true || data.status === 'waiting') {
			// Workflow did finish successfully

			activeExecutions.finalizeExecution(executionId, data);
			const returnData = getDataLastExecutedNodeData(data);
			return {
				executionId,
				data: returnData!.data!.main,
				waitTill: data.waitTill,
			};
		}
		activeExecutions.finalizeExecution(executionId, data);

		// Workflow did fail
		const { error } = data.data.resultData;

		throw objectToError(
			{
				...error,
				stack: error?.stack,
			},
			workflow,
		);
	}
}
