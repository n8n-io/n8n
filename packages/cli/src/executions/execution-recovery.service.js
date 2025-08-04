'use strict';
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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExecutionRecoveryService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('@/constants');
const node_crashed_error_1 = require('@/errors/node-crashed.error');
const workflow_crashed_error_1 = require('@/errors/workflow-crashed.error');
const execution_lifecycle_hooks_1 = require('@/execution-lifecycle/execution-lifecycle-hooks');
const push_1 = require('@/push');
let ExecutionRecoveryService = class ExecutionRecoveryService {
	constructor(logger, instanceSettings, push, executionRepository) {
		this.logger = logger;
		this.instanceSettings = instanceSettings;
		this.push = push;
		this.executionRepository = executionRepository;
	}
	async recoverFromLogs(executionId, messages) {
		if (this.instanceSettings.isFollower) return;
		const amendedExecution = await this.amend(executionId, messages);
		if (!amendedExecution) return null;
		this.logger.info('[Recovery] Logs available, amended execution', {
			executionId: amendedExecution.id,
		});
		await this.executionRepository.updateExistingExecution(executionId, amendedExecution);
		await this.runHooks(amendedExecution);
		this.push.once('editorUiConnected', async () => {
			await (0, n8n_workflow_1.sleep)(1000);
			this.push.broadcast({ type: 'executionRecovered', data: { executionId } });
		});
		return amendedExecution;
	}
	async amend(executionId, messages) {
		if (messages.length === 0) return await this.amendWithoutLogs(executionId);
		const { nodeMessages, workflowMessages } = this.toRelevantMessages(messages);
		if (nodeMessages.length === 0) return null;
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!execution || (['success', 'error'].includes(execution.status) && execution.data)) {
			return null;
		}
		const runExecutionData = execution.data ?? { resultData: { runData: {} } };
		let lastNodeRunTimestamp;
		for (const node of execution.workflowData.nodes) {
			const nodeStartedMessage = nodeMessages.find(
				(m) => m.payload.nodeName === node.name && m.eventName === 'n8n.node.started',
			);
			if (!nodeStartedMessage) continue;
			const nodeHasRunData = runExecutionData.resultData.runData[node.name] !== undefined;
			if (nodeHasRunData) continue;
			const nodeFinishedMessage = nodeMessages.find(
				(m) => m.payload.nodeName === node.name && m.eventName === 'n8n.node.finished',
			);
			const taskData = {
				startTime: nodeStartedMessage.ts.toUnixInteger(),
				executionIndex: 0,
				executionTime: -1,
				source: [null],
			};
			if (nodeFinishedMessage) {
				taskData.executionStatus = 'success';
				taskData.data ??= constants_1.ARTIFICIAL_TASK_DATA;
				taskData.executionTime = nodeFinishedMessage.ts.diff(nodeStartedMessage.ts).toMillis();
				lastNodeRunTimestamp = nodeFinishedMessage.ts;
			} else {
				taskData.executionStatus = 'crashed';
				taskData.error = new node_crashed_error_1.NodeCrashedError(node);
				taskData.executionTime = 0;
				runExecutionData.resultData.error = new workflow_crashed_error_1.WorkflowCrashedError();
				lastNodeRunTimestamp = nodeStartedMessage.ts;
			}
			runExecutionData.resultData.lastNodeExecuted = node.name;
			runExecutionData.resultData.runData[node.name] = [taskData];
		}
		return {
			...execution,
			status: execution.status === 'error' ? 'error' : 'crashed',
			stoppedAt: this.toStoppedAt(lastNodeRunTimestamp, workflowMessages),
			data: runExecutionData,
		};
	}
	async amendWithoutLogs(executionId) {
		const exists = await this.executionRepository.exists({ where: { id: executionId } });
		if (!exists) return null;
		await this.executionRepository.markAsCrashed(executionId);
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		return execution ?? null;
	}
	toRelevantMessages(messages) {
		return messages.reduce(
			(acc, cur) => {
				if (cur.eventName.startsWith('n8n.node.')) {
					acc.nodeMessages.push(cur);
				} else if (cur.eventName.startsWith('n8n.workflow.')) {
					acc.workflowMessages.push(cur);
				}
				return acc;
			},
			{ nodeMessages: [], workflowMessages: [] },
		);
	}
	toStoppedAt(timestamp, messages) {
		if (timestamp) return timestamp.toJSDate();
		const WORKFLOW_END_EVENTS = new Set([
			'n8n.workflow.success',
			'n8n.workflow.crashed',
			'n8n.workflow.failed',
		]);
		return (
			messages.find((m) => WORKFLOW_END_EVENTS.has(m.eventName)) ??
			messages.find((m) => m.eventName === 'n8n.workflow.started')
		)?.ts.toJSDate();
	}
	async runHooks(execution) {
		execution.data ??= { resultData: { runData: {} } };
		const lifecycleHooks = (0, execution_lifecycle_hooks_1.getLifecycleHooksForRegularMain)(
			{
				userId: '',
				workflowData: execution.workflowData,
				executionMode: execution.mode,
				executionData: execution.data,
				runData: execution.data.resultData.runData,
				retryOf: execution.retryOf ?? undefined,
			},
			execution.id,
		);
		const run = {
			data: execution.data,
			finished: false,
			mode: execution.mode,
			waitTill: execution.waitTill ?? undefined,
			startedAt: execution.startedAt,
			stoppedAt: execution.stoppedAt,
			status: execution.status,
		};
		await lifecycleHooks.runHook('workflowExecuteAfter', [run]);
	}
};
exports.ExecutionRecoveryService = ExecutionRecoveryService;
exports.ExecutionRecoveryService = ExecutionRecoveryService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.InstanceSettings,
			push_1.Push,
			db_1.ExecutionRepository,
		]),
	],
	ExecutionRecoveryService,
);
//# sourceMappingURL=execution-recovery.service.js.map
