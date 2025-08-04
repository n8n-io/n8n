'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowRunner = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const p_cancelable_1 = __importDefault(require('p-cancelable'));
const active_executions_1 = require('@/active-executions');
const config_1 = __importDefault(require('@/config'));
const execution_not_found_error_1 = require('@/errors/execution-not-found-error');
const max_stalled_count_error_1 = require('@/errors/max-stalled-count.error');
const execution_lifecycle_hooks_1 = require('@/execution-lifecycle/execution-lifecycle-hooks');
const execution_data_service_1 = require('@/executions/execution-data.service');
const pre_execution_checks_1 = require('@/executions/pre-execution-checks');
const manual_execution_service_1 = require('@/manual-execution.service');
const node_types_1 = require('@/node-types');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_static_data_service_1 = require('@/workflows/workflow-static-data.service');
const event_service_1 = require('./events/event.service');
let WorkflowRunner = class WorkflowRunner {
	constructor(
		logger,
		errorReporter,
		activeExecutions,
		executionRepository,
		workflowStaticDataService,
		nodeTypes,
		credentialsPermissionChecker,
		instanceSettings,
		manualExecutionService,
		executionDataService,
		eventService,
	) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.activeExecutions = activeExecutions;
		this.executionRepository = executionRepository;
		this.workflowStaticDataService = workflowStaticDataService;
		this.nodeTypes = nodeTypes;
		this.credentialsPermissionChecker = credentialsPermissionChecker;
		this.instanceSettings = instanceSettings;
		this.manualExecutionService = manualExecutionService;
		this.executionDataService = executionDataService;
		this.eventService = eventService;
		this.executionsMode = config_1.default.getEnv('executions.mode');
	}
	setExecutionMode(mode) {
		this.executionsMode = mode;
	}
	async processError(error, startedAt, executionMode, executionId, hooks) {
		if (
			error instanceof execution_not_found_error_1.ExecutionNotFoundError ||
			error instanceof n8n_workflow_1.ExecutionCancelledError ||
			error.message.includes('cancelled')
		) {
			return;
		}
		this.logger.error(`Problem with execution ${executionId}: ${error.message}. Aborting.`);
		this.errorReporter.error(error, { executionId });
		const isQueueMode = config_1.default.getEnv('executions.mode') === 'queue';
		if (isQueueMode) {
			const executionWithoutData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: false,
			});
			if (executionWithoutData?.finished === true && executionWithoutData?.status === 'success') {
				return;
			}
		}
		const fullRunData = {
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
		this.activeExecutions.finalizeExecution(executionId, fullRunData);
		await hooks?.runHook('workflowExecuteAfter', [fullRunData]);
	}
	async run(data, loadStaticData, realtime, restartExecutionId, responsePromise) {
		const executionId = await this.activeExecutions.add(data, restartExecutionId);
		const { id: workflowId, nodes } = data.workflowData;
		try {
			await this.credentialsPermissionChecker.check(workflowId, nodes);
		} catch (error) {
			const runData = this.executionDataService.generateFailedExecutionFromError(
				data.executionMode,
				error,
				error.node,
			);
			const lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForRegularMain)(
				data,
				executionId,
			);
			await lifecycleHooks.runHook('workflowExecuteBefore', [undefined, data.executionData]);
			await lifecycleHooks.runHook('workflowExecuteAfter', [runData]);
			responsePromise?.reject(error);
			this.activeExecutions.finalizeExecution(executionId);
			return executionId;
		}
		if (responsePromise) {
			this.activeExecutions.attachResponsePromise(executionId, responsePromise);
		}
		const shouldEnqueue =
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true'
				? this.executionsMode === 'queue'
				: this.executionsMode === 'queue' && data.executionMode !== 'manual';
		if (shouldEnqueue) {
			await this.enqueueExecution(executionId, workflowId, data, loadStaticData, realtime);
		} else {
			await this.runMainProcess(executionId, data, loadStaticData, restartExecutionId);
		}
		if (
			this.executionsMode !== 'queue' ||
			this.instanceSettings.instanceType === 'worker' ||
			data.executionMode === 'manual'
		) {
			const postExecutePromise = this.activeExecutions.getPostExecutePromise(executionId);
			postExecutePromise.catch((error) => {
				if (error instanceof n8n_workflow_1.ExecutionCancelledError) return;
				this.errorReporter.error(error, {
					extra: { executionId, workflowId },
				});
				this.logger.error('There was an error in the post-execution promise', {
					error,
					executionId,
					workflowId,
				});
			});
		}
		return executionId;
	}
	async runMainProcess(executionId, data, loadStaticData, restartExecutionId) {
		const workflowId = data.workflowData.id;
		if (loadStaticData === true && workflowId) {
			data.workflowData.staticData =
				await this.workflowStaticDataService.getStaticDataById(workflowId);
		}
		let executionTimeout;
		const workflowSettings = data.workflowData.settings ?? {};
		let workflowTimeout =
			workflowSettings.executionTimeout ?? config_1.default.getEnv('executions.timeout');
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config_1.default.getEnv('executions.maxTimeout'));
		}
		let pinData;
		if (['manual', 'evaluation'].includes(data.executionMode)) {
			pinData = data.pinData ?? data.workflowData.pinData;
		}
		const workflow = new n8n_workflow_1.Workflow({
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
		additionalData.restartExecutionId = restartExecutionId;
		additionalData.streamingEnabled = data.streamingEnabled;
		additionalData.executionId = executionId;
		this.logger.debug(
			`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
			{ executionId },
		);
		let workflowExecution;
		await this.executionRepository.setRunning(executionId);
		try {
			const lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForRegularMain)(
				data,
				executionId,
			);
			additionalData.hooks = lifecycleHooks;
			lifecycleHooks.addHandler('sendResponse', (response) => {
				this.activeExecutions.resolveResponsePromise(executionId, response);
			});
			if (data.streamingEnabled) {
				lifecycleHooks.addHandler('sendChunk', (chunk) => {
					data.httpResponse?.write(JSON.stringify(chunk) + '\n');
					data.httpResponse?.flush?.();
				});
			}
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
				const workflowExecute = new n8n_core_1.WorkflowExecute(
					additionalData,
					data.executionMode,
					data.executionData,
				);
				workflowExecution = workflowExecute.processRunExecutionData(workflow);
			} else {
				workflowExecution = await this.manualExecutionService.runManually(
					data,
					workflow,
					additionalData,
					executionId,
					pinData,
				);
			}
			this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
			if (workflowTimeout > 0) {
				let timeout =
					Math.min(workflowTimeout, config_1.default.getEnv('executions.maxTimeout')) * 1000;
				if (data.startedAt && data.startedAt instanceof Date) {
					const now = Date.now();
					timeout = Math.max(timeout - (now - data.startedAt.getTime()), 0);
				}
				if (timeout === 0) {
					this.activeExecutions.stopExecution(executionId);
				} else {
					executionTimeout = setTimeout(() => {
						void this.activeExecutions.stopExecution(executionId);
					}, timeout);
				}
			}
			workflowExecution
				.then((fullRunData) => {
					clearTimeout(executionTimeout);
					if (workflowExecution.isCanceled) {
						fullRunData.finished = false;
					}
					fullRunData.status = this.activeExecutions.getStatus(executionId);
					this.activeExecutions.resolveExecutionResponsePromise(executionId);
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
	async enqueueExecution(executionId, workflowId, data, loadStaticData, realtime) {
		const jobData = {
			workflowId,
			executionId,
			loadStaticData: !!loadStaticData,
			pushRef: data.pushRef,
			streamingEnabled: data.streamingEnabled,
		};
		if (!this.scalingService) {
			const { ScalingService } = await Promise.resolve().then(() =>
				__importStar(require('@/scaling/scaling.service')),
			);
			this.scalingService = di_1.Container.get(ScalingService);
			await this.scalingService.setupQueue();
		}
		let job;
		let lifecycleHooks;
		try {
			job = await this.scalingService.addJob(jobData, { priority: realtime ? 50 : 100 });
			lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForScalingMain)(
				data,
				executionId,
			);
			await lifecycleHooks.runHook('workflowExecuteBefore', [undefined, data.executionData]);
		} catch (error) {
			const lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForScalingWorker)(
				data,
				executionId,
			);
			await this.processError(error, new Date(), data.executionMode, executionId, lifecycleHooks);
			throw error;
		}
		const workflowExecution = new p_cancelable_1.default(async (resolve, reject, onCancel) => {
			onCancel.shouldReject = false;
			onCancel(async () => {
				await this.scalingService.stopJob(job);
				const lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForScalingWorker)(
					data,
					executionId,
				);
				const error = new n8n_workflow_1.ExecutionCancelledError(executionId);
				await this.processError(error, new Date(), data.executionMode, executionId, lifecycleHooks);
				reject(error);
			});
			try {
				await job.finished();
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes('job stalled more than maxStalledCount')
				) {
					error = new max_stalled_count_error_1.MaxStalledCountError(error);
					this.eventService.emit('job-stalled', {
						executionId: job.data.executionId,
						workflowId: job.data.workflowId,
						hostId: this.instanceSettings.hostId,
						jobId: job.id.toString(),
					});
				}
				const lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForScalingWorker)(
					data,
					executionId,
				);
				await this.processError(error, new Date(), data.executionMode, executionId, lifecycleHooks);
				reject(error);
			}
			const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (!fullExecutionData) {
				return reject(new Error(`Could not find execution with id "${executionId}"`));
			}
			const runData = {
				finished: fullExecutionData.finished,
				mode: fullExecutionData.mode,
				startedAt: fullExecutionData.startedAt,
				stoppedAt: fullExecutionData.stoppedAt,
				status: fullExecutionData.status,
				data: fullExecutionData.data,
				jobId: job.id.toString(),
			};
			this.activeExecutions.finalizeExecution(executionId, runData);
			await lifecycleHooks.runHook('workflowExecuteAfter', [runData]);
			resolve(runData);
		});
		workflowExecution.catch(() => {});
		this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
	}
};
exports.WorkflowRunner = WorkflowRunner;
exports.WorkflowRunner = WorkflowRunner = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			active_executions_1.ActiveExecutions,
			db_1.ExecutionRepository,
			workflow_static_data_service_1.WorkflowStaticDataService,
			node_types_1.NodeTypes,
			pre_execution_checks_1.CredentialsPermissionChecker,
			n8n_core_1.InstanceSettings,
			manual_execution_service_1.ManualExecutionService,
			execution_data_service_1.ExecutionDataService,
			event_service_1.EventService,
		]),
	],
	WorkflowRunner,
);
//# sourceMappingURL=workflow-runner.js.map
