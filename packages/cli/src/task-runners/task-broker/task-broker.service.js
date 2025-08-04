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
exports.TaskBroker = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const nanoid_1 = require('nanoid');
const task_deferred_error_1 = require('@/task-runners/task-broker/errors/task-deferred.error');
const task_reject_error_1 = require('@/task-runners/task-broker/errors/task-reject.error');
const task_runner_accept_timeout_error_1 = require('@/task-runners/task-broker/errors/task-runner-accept-timeout.error');
const task_runner_execution_timeout_error_1 = require('@/task-runners/task-broker/errors/task-runner-execution-timeout.error');
const task_runner_lifecycle_events_1 = require('@/task-runners/task-runner-lifecycle-events');
let TaskBroker = class TaskBroker {
	constructor(logger, taskRunnersConfig, taskRunnerLifecycleEvents, globalConfig) {
		this.logger = logger;
		this.taskRunnersConfig = taskRunnersConfig;
		this.taskRunnerLifecycleEvents = taskRunnerLifecycleEvents;
		this.globalConfig = globalConfig;
		this.knownRunners = new Map();
		this.requesters = new Map();
		this.tasks = new Map();
		this.runnerAcceptRejects = new Map();
		this.requesterAcceptRejects = new Map();
		this.pendingTaskOffers = [];
		this.pendingTaskRequests = [];
		if (this.taskRunnersConfig.taskTimeout <= 0) {
			throw new n8n_workflow_1.UserError('Task timeout must be greater than 0');
		}
	}
	expireTasks() {
		const now = process.hrtime.bigint();
		for (let i = this.pendingTaskOffers.length - 1; i >= 0; i--) {
			const offer = this.pendingTaskOffers[i];
			if (offer.validFor === -1) continue;
			if (offer.validUntil < now) {
				this.pendingTaskOffers.splice(i, 1);
			}
		}
	}
	registerRunner(runner, messageCallback) {
		this.knownRunners.set(runner.id, { runner, messageCallback });
		void this.knownRunners.get(runner.id).messageCallback({ type: 'broker:runnerregistered' });
	}
	deregisterRunner(runnerId, error) {
		this.knownRunners.delete(runnerId);
		for (let i = this.pendingTaskOffers.length - 1; i >= 0; i--) {
			if (this.pendingTaskOffers[i].runnerId === runnerId) {
				this.pendingTaskOffers.splice(i, 1);
			}
		}
		for (const task of this.tasks.values()) {
			if (task.runnerId === runnerId) {
				void this.failTask(task.id, error);
				this.handleRunnerReject(
					task.id,
					`The Task Runner (${runnerId}) has disconnected: ${error.message}`,
				);
			}
		}
	}
	registerRequester(requesterId, messageCallback) {
		this.requesters.set(requesterId, messageCallback);
	}
	deregisterRequester(requesterId) {
		this.requesters.delete(requesterId);
	}
	async messageRunner(runnerId, message) {
		await this.knownRunners.get(runnerId)?.messageCallback(message);
	}
	async messageRequester(requesterId, message) {
		await this.requesters.get(requesterId)?.(message);
	}
	async onRunnerMessage(runnerId, message) {
		const runner = this.knownRunners.get(runnerId);
		if (!runner) {
			return;
		}
		switch (message.type) {
			case 'runner:taskaccepted':
				this.handleRunnerAccept(message.taskId);
				break;
			case 'runner:taskrejected':
				this.handleRunnerReject(message.taskId, message.reason);
				break;
			case 'runner:taskdeferred':
				this.handleRunnerDeferred(message.taskId);
				break;
			case 'runner:taskoffer':
				this.taskOffered({
					runnerId,
					taskType: message.taskType,
					offerId: message.offerId,
					validFor: message.validFor,
					validUntil:
						message.validFor === -1
							? 0n
							: process.hrtime.bigint() + BigInt(message.validFor * 1_000_000),
				});
				break;
			case 'runner:taskdone':
				await this.taskDoneHandler(message.taskId, message.data);
				break;
			case 'runner:taskerror':
				await this.taskErrorHandler(message.taskId, message.error);
				break;
			case 'runner:taskdatarequest':
				await this.handleDataRequest(message.taskId, message.requestId, message.requestParams);
				break;
			case 'runner:nodetypesrequest':
				await this.handleNodeTypesRequest(message.taskId, message.requestId, message.requestParams);
				break;
			case 'runner:rpc':
				await this.handleRpcRequest(message.taskId, message.callId, message.name, message.params);
				break;
			case 'runner:info':
				break;
		}
	}
	async handleRpcRequest(taskId, callId, name, params) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}
		await this.messageRequester(task.requesterId, {
			type: 'broker:rpc',
			taskId,
			callId,
			name,
			params,
		});
	}
	handleRunnerAccept(taskId) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.accept();
			this.runnerAcceptRejects.delete(taskId);
		}
	}
	handleRunnerReject(taskId, reason) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.reject(new task_reject_error_1.TaskRejectError(reason));
			this.runnerAcceptRejects.delete(taskId);
		}
	}
	handleRunnerDeferred(taskId) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.reject(new task_deferred_error_1.TaskDeferredError());
			this.runnerAcceptRejects.delete(taskId);
		}
	}
	async handleDataRequest(taskId, requestId, requestParams) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}
		await this.messageRequester(task.requesterId, {
			type: 'broker:taskdatarequest',
			taskId,
			requestId,
			requestParams,
		});
	}
	async handleNodeTypesRequest(taskId, requestId, requestParams) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}
		await this.messageRequester(task.requesterId, {
			type: 'broker:nodetypesrequest',
			taskId,
			requestId,
			requestParams,
		});
	}
	async handleResponse(taskId, requestId, data) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}
		await this.messageRunner(task.requesterId, {
			type: 'broker:taskdataresponse',
			taskId,
			requestId,
			data,
		});
	}
	async onRequesterMessage(requesterId, message) {
		switch (message.type) {
			case 'requester:tasksettings':
				this.handleRequesterAccept(message.taskId, message.settings);
				break;
			case 'requester:taskcancel':
				await this.cancelTask(message.taskId, message.reason);
				break;
			case 'requester:taskrequest':
				this.taskRequested({
					taskType: message.taskType,
					requestId: message.requestId,
					requesterId,
				});
				break;
			case 'requester:taskdataresponse':
				await this.handleRequesterDataResponse(message.taskId, message.requestId, message.data);
				break;
			case 'requester:nodetypesresponse':
				await this.handleRequesterNodeTypesResponse(
					message.taskId,
					message.requestId,
					message.nodeTypes,
				);
				break;
			case 'requester:rpcresponse':
				await this.handleRequesterRpcResponse(
					message.taskId,
					message.callId,
					message.status,
					message.data,
				);
				break;
		}
	}
	async handleRequesterRpcResponse(taskId, callId, status, data) {
		const runner = await this.getRunnerOrFailTask(taskId);
		await this.messageRunner(runner.id, {
			type: 'broker:rpcresponse',
			taskId,
			callId,
			status,
			data,
		});
	}
	async handleRequesterDataResponse(taskId, requestId, data) {
		const runner = await this.getRunnerOrFailTask(taskId);
		await this.messageRunner(runner.id, {
			type: 'broker:taskdataresponse',
			taskId,
			requestId,
			data,
		});
	}
	async handleRequesterNodeTypesResponse(taskId, requestId, nodeTypes) {
		const runner = await this.getRunnerOrFailTask(taskId);
		await this.messageRunner(runner.id, {
			type: 'broker:nodetypes',
			taskId,
			requestId,
			nodeTypes,
		});
	}
	handleRequesterAccept(taskId, settings) {
		const acceptReject = this.requesterAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.accept(settings);
			this.requesterAcceptRejects.delete(taskId);
		}
	}
	handleRequesterReject(taskId, reason) {
		const acceptReject = this.requesterAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.reject(new task_reject_error_1.TaskRejectError(reason));
			this.requesterAcceptRejects.delete(taskId);
		}
	}
	async cancelTask(taskId, reason) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}
		this.tasks.delete(taskId);
		await this.messageRunner(task.runnerId, {
			type: 'broker:taskcancel',
			taskId,
			reason,
		});
	}
	async failTask(taskId, error) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}
		this.tasks.delete(taskId);
		await this.messageRequester(task.requesterId, {
			type: 'broker:taskerror',
			taskId,
			error,
		});
	}
	async getRunnerOrFailTask(taskId) {
		const task = this.tasks.get(taskId);
		if (!task) {
			throw new n8n_workflow_1.UnexpectedError(
				`Cannot find runner, failed to find task (${taskId})`,
			);
		}
		const runner = this.knownRunners.get(task.runnerId);
		if (!runner) {
			const error = new n8n_workflow_1.UnexpectedError(
				`Cannot find runner, failed to find runner (${task.runnerId})`,
			);
			await this.failTask(taskId, error);
			throw error;
		}
		return runner.runner;
	}
	async sendTaskSettings(taskId, settings) {
		const runner = await this.getRunnerOrFailTask(taskId);
		const task = this.tasks.get(taskId);
		if (!task) return;
		task.timeout = setTimeout(async () => {
			await this.handleTaskTimeout(taskId);
		}, this.taskRunnersConfig.taskTimeout * constants_1.Time.seconds.toMilliseconds);
		await this.messageRunner(runner.id, {
			type: 'broker:tasksettings',
			taskId,
			settings,
		});
	}
	async handleTaskTimeout(taskId) {
		const task = this.tasks.get(taskId);
		if (!task) return;
		if (this.taskRunnersConfig.mode === 'internal') {
			this.taskRunnerLifecycleEvents.emit('runner:timed-out-during-task');
		} else if (this.taskRunnersConfig.mode === 'external') {
			await this.messageRunner(task.runnerId, {
				type: 'broker:taskcancel',
				taskId,
				reason: 'Task execution timed out',
			});
		}
		const { taskTimeout, mode } = this.taskRunnersConfig;
		await this.taskErrorHandler(
			taskId,
			new task_runner_execution_timeout_error_1.TaskRunnerExecutionTimeoutError({
				taskTimeout,
				isSelfHosted: this.globalConfig.deployment.type !== 'cloud',
				mode,
			}),
		);
	}
	async taskDoneHandler(taskId, data) {
		const task = this.tasks.get(taskId);
		if (!task) return;
		clearTimeout(task.timeout);
		await this.requesters.get(task.requesterId)?.({
			type: 'broker:taskdone',
			taskId: task.id,
			data,
		});
		this.tasks.delete(task.id);
	}
	async taskErrorHandler(taskId, error) {
		const task = this.tasks.get(taskId);
		if (!task) return;
		clearTimeout(task.timeout);
		await this.requesters.get(task.requesterId)?.({
			type: 'broker:taskerror',
			taskId: task.id,
			error,
		});
		this.tasks.delete(task.id);
	}
	async acceptOffer(offer, request) {
		const taskId = (0, nanoid_1.nanoid)(8);
		try {
			const acceptPromise = new Promise((resolve, reject) => {
				this.runnerAcceptRejects.set(taskId, { accept: resolve, reject });
				setTimeout(() => {
					reject(
						new task_runner_accept_timeout_error_1.TaskRunnerAcceptTimeoutError(
							taskId,
							offer.runnerId,
						),
					);
				}, 2000);
			});
			await this.messageRunner(offer.runnerId, {
				type: 'broker:taskofferaccept',
				offerId: offer.offerId,
				taskId,
			});
			await acceptPromise;
		} catch (e) {
			request.acceptInProgress = false;
			if (e instanceof task_reject_error_1.TaskRejectError) {
				this.logger.info(`Task (${taskId}) rejected by Runner with reason "${e.reason}"`);
				return;
			}
			if (e instanceof task_deferred_error_1.TaskDeferredError) {
				this.logger.debug(`Task (${taskId}) deferred until runner is ready`);
				this.pendingTaskRequests.push(request);
				return;
			}
			if (e instanceof task_runner_accept_timeout_error_1.TaskRunnerAcceptTimeoutError) {
				this.logger.warn(e.message);
				return;
			}
			throw e;
		}
		const task = {
			id: taskId,
			taskType: offer.taskType,
			runnerId: offer.runnerId,
			requesterId: request.requesterId,
		};
		this.tasks.set(taskId, task);
		const requestIndex = this.pendingTaskRequests.findIndex(
			(r) => r.requestId === request.requestId,
		);
		if (requestIndex === -1) {
			this.logger.error(
				`Failed to find task request (${request.requestId}) after a task was accepted. This shouldn't happen, and might be a race condition.`,
			);
			return;
		}
		this.pendingTaskRequests.splice(requestIndex, 1);
		try {
			const acceptPromise = new Promise((resolve, reject) => {
				this.requesterAcceptRejects.set(taskId, {
					accept: resolve,
					reject,
				});
				setTimeout(() => {
					reject('Requester timed out');
				}, 2000);
			});
			await this.messageRequester(request.requesterId, {
				type: 'broker:taskready',
				requestId: request.requestId,
				taskId,
			});
			const settings = await acceptPromise;
			await this.sendTaskSettings(task.id, settings);
		} catch (e) {
			if (e instanceof task_reject_error_1.TaskRejectError) {
				await this.cancelTask(task.id, e.reason);
				this.logger.info(`Task (${taskId}) rejected by Requester with reason "${e.reason}"`);
				return;
			}
			await this.cancelTask(task.id, 'Unknown reason');
			throw e;
		}
	}
	settleTasks() {
		this.expireTasks();
		for (const request of this.pendingTaskRequests) {
			if (request.acceptInProgress) {
				continue;
			}
			const offerIndex = this.pendingTaskOffers.findIndex((o) => o.taskType === request.taskType);
			if (offerIndex === -1) {
				continue;
			}
			const offer = this.pendingTaskOffers[offerIndex];
			request.acceptInProgress = true;
			this.pendingTaskOffers.splice(offerIndex, 1);
			void this.acceptOffer(offer, request);
		}
	}
	taskRequested(request) {
		this.pendingTaskRequests.push(request);
		this.settleTasks();
	}
	taskOffered(offer) {
		this.pendingTaskOffers.push(offer);
		this.settleTasks();
	}
	getTasks() {
		return this.tasks;
	}
	getPendingTaskOffers() {
		return this.pendingTaskOffers;
	}
	getPendingTaskRequests() {
		return this.pendingTaskRequests;
	}
	getKnownRunners() {
		return this.knownRunners;
	}
	getKnownRequesters() {
		return this.requesters;
	}
	getRunnerAcceptRejects() {
		return this.runnerAcceptRejects;
	}
	setTasks(tasks) {
		this.tasks = new Map(Object.entries(tasks));
	}
	setPendingTaskOffers(pendingTaskOffers) {
		this.pendingTaskOffers = pendingTaskOffers;
	}
	setPendingTaskRequests(pendingTaskRequests) {
		this.pendingTaskRequests = pendingTaskRequests;
	}
	setRunnerAcceptRejects(runnerAcceptRejects) {
		this.runnerAcceptRejects = new Map(Object.entries(runnerAcceptRejects));
	}
};
exports.TaskBroker = TaskBroker;
exports.TaskBroker = TaskBroker = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			config_1.TaskRunnersConfig,
			task_runner_lifecycle_events_1.TaskRunnerLifecycleEvents,
			config_1.GlobalConfig,
		]),
	],
	TaskBroker,
);
//# sourceMappingURL=task-broker.service.js.map
