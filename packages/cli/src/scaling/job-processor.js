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
exports.JobProcessor = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const config_1 = __importDefault(require('@/config'));
const execution_lifecycle_hooks_1 = require('@/execution-lifecycle/execution-lifecycle-hooks');
const manual_execution_service_1 = require('@/manual-execution.service');
const node_types_1 = require('@/node-types');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
let JobProcessor = class JobProcessor {
	constructor(
		logger,
		executionRepository,
		workflowRepository,
		nodeTypes,
		instanceSettings,
		manualExecutionService,
	) {
		this.logger = logger;
		this.executionRepository = executionRepository;
		this.workflowRepository = workflowRepository;
		this.nodeTypes = nodeTypes;
		this.instanceSettings = instanceSettings;
		this.manualExecutionService = manualExecutionService;
		this.runningJobs = {};
		this.logger = this.logger.scoped('scaling');
	}
	async processJob(job) {
		const { executionId, loadStaticData } = job.data;
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!execution) {
			throw new n8n_workflow_1.UnexpectedError(
				`Worker failed to find data for execution ${executionId} (job ${job.id})`,
			);
		}
		if (execution.status === 'crashed') return { success: false };
		const workflowId = execution.workflowData.id;
		this.logger.info(`Worker started execution ${executionId} (job ${job.id})`, {
			executionId,
			workflowId,
			jobId: job.id,
		});
		const startedAt = await this.executionRepository.setRunning(executionId);
		let { staticData } = execution.workflowData;
		if (loadStaticData) {
			const workflowData = await this.workflowRepository.findOne({
				select: ['id', 'staticData'],
				where: { id: workflowId },
			});
			if (workflowData === null) {
				throw new n8n_workflow_1.UnexpectedError(
					`Worker failed to find workflow ${workflowId} to run execution ${executionId} (job ${job.id})`,
				);
			}
			staticData = workflowData.staticData;
		}
		const workflowSettings = execution.workflowData.settings ?? {};
		let workflowTimeout =
			workflowSettings.executionTimeout ?? config_1.default.getEnv('executions.timeout');
		let executionTimeoutTimestamp;
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config_1.default.getEnv('executions.maxTimeout'));
			executionTimeoutTimestamp = Date.now() + workflowTimeout * 1000;
		}
		const workflow = new n8n_workflow_1.Workflow({
			id: workflowId,
			name: execution.workflowData.name,
			nodes: execution.workflowData.nodes,
			connections: execution.workflowData.connections,
			active: execution.workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData,
			settings: execution.workflowData.settings,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			undefined,
			undefined,
			executionTimeoutTimestamp,
		);
		additionalData.streamingEnabled = job.data.streamingEnabled;
		const { pushRef } = job.data;
		const lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForScalingWorker)(
			{
				executionMode: execution.mode,
				workflowData: execution.workflowData,
				retryOf: execution.retryOf,
				pushRef,
			},
			executionId,
		);
		additionalData.hooks = lifecycleHooks;
		if (pushRef) {
			additionalData.sendDataToUI = WorkflowExecuteAdditionalData.sendDataToUI.bind({ pushRef });
		}
		lifecycleHooks.addHandler('sendResponse', async (response) => {
			const msg = {
				kind: 'respond-to-webhook',
				executionId,
				response: this.encodeWebhookResponse(response),
				workerId: this.instanceSettings.hostId,
			};
			await job.progress(msg);
		});
		lifecycleHooks.addHandler('sendChunk', async (chunk) => {
			const msg = {
				kind: 'send-chunk',
				executionId,
				chunkText: chunk,
				workerId: this.instanceSettings.hostId,
			};
			await job.progress(msg);
		});
		additionalData.executionId = executionId;
		additionalData.setExecutionStatus = (status) => {
			this.logger.debug(
				`Queued worker execution status for execution ${executionId} (job ${job.id}) is "${status}"`,
				{
					executionId,
					workflowId,
					jobId: job.id,
				},
			);
		};
		let workflowExecute;
		let workflowRun;
		const { startData, resultData, manualData } = execution.data;
		if (execution.data?.executionData) {
			workflowExecute = new n8n_core_1.WorkflowExecute(
				additionalData,
				execution.mode,
				execution.data,
			);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else {
			const data = {
				executionMode: execution.mode,
				workflowData: execution.workflowData,
				destinationNode: startData?.destinationNode,
				startNodes: startData?.startNodes,
				runData: resultData.runData,
				pinData: resultData.pinData,
				partialExecutionVersion: manualData?.partialExecutionVersion,
				dirtyNodeNames: manualData?.dirtyNodeNames,
				triggerToStartFrom: manualData?.triggerToStartFrom,
				userId: manualData?.userId,
			};
			try {
				const workflowExecution = await this.manualExecutionService.runManually(
					data,
					workflow,
					additionalData,
					executionId,
					resultData.pinData,
				);
				workflowRun = workflowExecution;
			} catch (error) {
				if (error instanceof n8n_core_1.WorkflowHasIssuesError) {
					const now = new Date();
					const runData = {
						mode: 'manual',
						status: 'error',
						finished: false,
						startedAt: now,
						stoppedAt: now,
						data: { resultData: { error, runData: {} } },
					};
					await lifecycleHooks.runHook('workflowExecuteAfter', [runData]);
					return { success: false };
				}
				throw error;
			}
		}
		const runningJob = {
			run: workflowRun,
			executionId,
			workflowId: execution.workflowId,
			workflowName: execution.workflowData.name,
			mode: execution.mode,
			startedAt,
			retryOf: execution.retryOf ?? undefined,
			status: execution.status,
		};
		this.runningJobs[job.id] = runningJob;
		await workflowRun;
		delete this.runningJobs[job.id];
		this.logger.info(`Worker finished execution ${executionId} (job ${job.id})`, {
			executionId,
			workflowId,
			jobId: job.id,
		});
		const msg = {
			kind: 'job-finished',
			executionId,
			workerId: this.instanceSettings.hostId,
		};
		await job.progress(msg);
		return { success: true };
	}
	stopJob(jobId) {
		this.runningJobs[jobId]?.run.cancel();
		delete this.runningJobs[jobId];
	}
	getRunningJobIds() {
		return Object.keys(this.runningJobs);
	}
	getRunningJobsSummary() {
		return Object.values(this.runningJobs).map(({ run, ...summary }) => summary);
	}
	encodeWebhookResponse(response) {
		if (typeof response === 'object' && Buffer.isBuffer(response.body)) {
			response.body = {
				'__@N8nEncodedBuffer@__': response.body.toString(n8n_workflow_1.BINARY_ENCODING),
			};
		}
		return response;
	}
};
exports.JobProcessor = JobProcessor;
exports.JobProcessor = JobProcessor = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.ExecutionRepository,
			db_1.WorkflowRepository,
			node_types_1.NodeTypes,
			n8n_core_1.InstanceSettings,
			manual_execution_service_1.ManualExecutionService,
		]),
	],
	JobProcessor,
);
//# sourceMappingURL=job-processor.js.map
