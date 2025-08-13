import { Logger } from '@n8n/backend-common';
import { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type {
	BrokerMessage,
	RequesterMessage,
	RunnerMessage,
	TaskResultData,
} from '@n8n/task-runner';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { TaskDeferredError } from '@/task-runners/task-broker/errors/task-deferred.error';
import { TaskRejectError } from '@/task-runners/task-broker/errors/task-reject.error';
import { TaskRunnerAcceptTimeoutError } from '@/task-runners/task-broker/errors/task-runner-accept-timeout.error';
import { TaskRunnerExecutionTimeoutError } from '@/task-runners/task-broker/errors/task-runner-execution-timeout.error';
import { TaskRunnerLifecycleEvents } from '@/task-runners/task-runner-lifecycle-events';

export interface TaskRunner {
	id: string;
	name?: string;
	taskTypes: string[];
	lastSeen: Date;
}

export interface Task {
	id: string;
	runnerId: TaskRunner['id'];
	requesterId: string;
	taskType: string;
	timeout?: NodeJS.Timeout;
}

export interface TaskOffer {
	offerId: string;
	runnerId: TaskRunner['id'];
	taskType: string;

	/** How long (in milliseconds) the task offer is valid for. `-1` for non-expiring offer from launcher. */
	validFor: number;
	validUntil: bigint;
}

export interface TaskRequest {
	requestId: string;
	requesterId: string;
	taskType: string;

	acceptInProgress?: boolean;
}

export type MessageCallback = (message: BrokerMessage.ToRunner.All) => Promise<void> | void;
export type RequesterMessageCallback = (
	message: BrokerMessage.ToRequester.All,
) => Promise<void> | void;

type RunnerAcceptCallback = () => void;
type RequesterAcceptCallback = (
	settings: RequesterMessage.ToBroker.TaskSettings['settings'],
) => void;
type TaskRejectCallback = (reason: TaskRejectError | TaskDeferredError) => void;

@Service()
export class TaskBroker {
	private knownRunners: Map<
		TaskRunner['id'],
		{ runner: TaskRunner; messageCallback: MessageCallback }
	> = new Map();

	private requesters: Map<string, RequesterMessageCallback> = new Map();

	private tasks: Map<Task['id'], Task> = new Map();

	private runnerAcceptRejects: Map<
		Task['id'],
		{ accept: RunnerAcceptCallback; reject: TaskRejectCallback }
	> = new Map();

	private requesterAcceptRejects: Map<
		Task['id'],
		{ accept: RequesterAcceptCallback; reject: TaskRejectCallback }
	> = new Map();

	private pendingTaskOffers: TaskOffer[] = [];

	private pendingTaskRequests: TaskRequest[] = [];

	constructor(
		private readonly logger: Logger,
		private readonly taskRunnersConfig: TaskRunnersConfig,
		private readonly taskRunnerLifecycleEvents: TaskRunnerLifecycleEvents,
		private readonly globalConfig: GlobalConfig,
	) {
		if (this.taskRunnersConfig.taskTimeout <= 0) {
			throw new UserError('Task timeout must be greater than 0');
		}
	}

	expireTasks() {
		const now = process.hrtime.bigint();
		for (let i = this.pendingTaskOffers.length - 1; i >= 0; i--) {
			const offer = this.pendingTaskOffers[i];
			if (offer.validFor === -1) continue; // non-expiring offer
			if (offer.validUntil < now) {
				this.pendingTaskOffers.splice(i, 1);
			}
		}
	}

	registerRunner(runner: TaskRunner, messageCallback: MessageCallback) {
		this.knownRunners.set(runner.id, { runner, messageCallback });
		void this.knownRunners.get(runner.id)!.messageCallback({ type: 'broker:runnerregistered' });
	}

	deregisterRunner(runnerId: string, error: Error) {
		this.knownRunners.delete(runnerId);

		// Remove any pending offers
		for (let i = this.pendingTaskOffers.length - 1; i >= 0; i--) {
			if (this.pendingTaskOffers[i].runnerId === runnerId) {
				this.pendingTaskOffers.splice(i, 1);
			}
		}

		// Fail any tasks
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

	registerRequester(requesterId: string, messageCallback: RequesterMessageCallback) {
		this.requesters.set(requesterId, messageCallback);
	}

	deregisterRequester(requesterId: string) {
		this.requesters.delete(requesterId);
	}

	private async messageRunner(runnerId: TaskRunner['id'], message: BrokerMessage.ToRunner.All) {
		await this.knownRunners.get(runnerId)?.messageCallback(message);
	}

	private async messageRequester(requesterId: string, message: BrokerMessage.ToRequester.All) {
		await this.requesters.get(requesterId)?.(message);
	}

	async onRunnerMessage(runnerId: TaskRunner['id'], message: RunnerMessage.ToBroker.All) {
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
							? 0n // sentinel value for non-expiring offer
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
			// Already handled
			case 'runner:info':
				break;
		}
	}

	async handleRpcRequest(
		taskId: Task['id'],
		callId: string,
		name: RunnerMessage.ToBroker.RPC['name'],
		params: unknown[],
	) {
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

	handleRunnerAccept(taskId: Task['id']) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.accept();
			this.runnerAcceptRejects.delete(taskId);
		}
	}

	handleRunnerReject(taskId: Task['id'], reason: string) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.reject(new TaskRejectError(reason));
			this.runnerAcceptRejects.delete(taskId);
		}
	}

	handleRunnerDeferred(taskId: Task['id']) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.reject(new TaskDeferredError());
			this.runnerAcceptRejects.delete(taskId);
		}
	}

	async handleDataRequest(
		taskId: Task['id'],
		requestId: RunnerMessage.ToBroker.TaskDataRequest['requestId'],
		requestParams: RunnerMessage.ToBroker.TaskDataRequest['requestParams'],
	) {
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

	async handleNodeTypesRequest(
		taskId: Task['id'],
		requestId: RunnerMessage.ToBroker.NodeTypesRequest['requestId'],
		requestParams: RunnerMessage.ToBroker.NodeTypesRequest['requestParams'],
	) {
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

	async handleResponse(
		taskId: Task['id'],
		requestId: RunnerMessage.ToBroker.TaskDataRequest['requestId'],
		data: unknown,
	) {
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

	async onRequesterMessage(requesterId: string, message: RequesterMessage.ToBroker.All) {
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

	async handleRequesterRpcResponse(
		taskId: string,
		callId: string,
		status: RequesterMessage.ToBroker.RPCResponse['status'],
		data: unknown,
	) {
		const runner = await this.getRunnerOrFailTask(taskId);
		await this.messageRunner(runner.id, {
			type: 'broker:rpcresponse',
			taskId,
			callId,
			status,
			data,
		});
	}

	async handleRequesterDataResponse(taskId: Task['id'], requestId: string, data: unknown) {
		const runner = await this.getRunnerOrFailTask(taskId);

		await this.messageRunner(runner.id, {
			type: 'broker:taskdataresponse',
			taskId,
			requestId,
			data,
		});
	}

	async handleRequesterNodeTypesResponse(
		taskId: Task['id'],
		requestId: RequesterMessage.ToBroker.NodeTypesResponse['requestId'],
		nodeTypes: RequesterMessage.ToBroker.NodeTypesResponse['nodeTypes'],
	) {
		const runner = await this.getRunnerOrFailTask(taskId);

		await this.messageRunner(runner.id, {
			type: 'broker:nodetypes',
			taskId,
			requestId,
			nodeTypes,
		});
	}

	handleRequesterAccept(
		taskId: Task['id'],
		settings: RequesterMessage.ToBroker.TaskSettings['settings'],
	) {
		const acceptReject = this.requesterAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.accept(settings);
			this.requesterAcceptRejects.delete(taskId);
		}
	}

	handleRequesterReject(taskId: Task['id'], reason: string) {
		const acceptReject = this.requesterAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.reject(new TaskRejectError(reason));
			this.requesterAcceptRejects.delete(taskId);
		}
	}

	private async cancelTask(taskId: Task['id'], reason: string) {
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

	private async failTask(taskId: Task['id'], error: Error) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}
		this.tasks.delete(taskId);
		// TODO: special message type?
		await this.messageRequester(task.requesterId, {
			type: 'broker:taskerror',
			taskId,
			error,
		});
	}

	private async getRunnerOrFailTask(taskId: Task['id']): Promise<TaskRunner> {
		const task = this.tasks.get(taskId);
		if (!task) {
			throw new UnexpectedError(`Cannot find runner, failed to find task (${taskId})`);
		}
		const runner = this.knownRunners.get(task.runnerId);
		if (!runner) {
			const error = new UnexpectedError(
				`Cannot find runner, failed to find runner (${task.runnerId})`,
			);
			await this.failTask(taskId, error);
			throw error;
		}
		return runner.runner;
	}

	async sendTaskSettings(taskId: Task['id'], settings: unknown) {
		const runner = await this.getRunnerOrFailTask(taskId);

		const task = this.tasks.get(taskId);
		if (!task) return;

		task.timeout = setTimeout(async () => {
			await this.handleTaskTimeout(taskId);
		}, this.taskRunnersConfig.taskTimeout * Time.seconds.toMilliseconds);

		await this.messageRunner(runner.id, {
			type: 'broker:tasksettings',
			taskId,
			settings,
		});
	}

	private async handleTaskTimeout(taskId: Task['id']) {
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
			new TaskRunnerExecutionTimeoutError({
				taskTimeout,
				isSelfHosted: this.globalConfig.deployment.type !== 'cloud',
				mode,
			}),
		);
	}

	async taskDoneHandler(taskId: Task['id'], data: TaskResultData) {
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

	async taskErrorHandler(taskId: Task['id'], error: unknown) {
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

	async acceptOffer(offer: TaskOffer, request: TaskRequest): Promise<void> {
		const taskId = nanoid(8);

		try {
			const acceptPromise = new Promise((resolve, reject) => {
				this.runnerAcceptRejects.set(taskId, { accept: resolve as () => void, reject });

				// TODO: customisable timeout
				setTimeout(() => {
					reject(new TaskRunnerAcceptTimeoutError(taskId, offer.runnerId));
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
			if (e instanceof TaskRejectError) {
				this.logger.info(`Task (${taskId}) rejected by Runner with reason "${e.reason}"`);
				return;
			}
			if (e instanceof TaskDeferredError) {
				this.logger.debug(`Task (${taskId}) deferred until runner is ready`);
				this.pendingTaskRequests.push(request); // will settle on receiving task offer from runner
				return;
			}
			if (e instanceof TaskRunnerAcceptTimeoutError) {
				this.logger.warn(e.message);
				return;
			}
			throw e;
		}

		const task: Task = {
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
			const acceptPromise = new Promise<RequesterMessage.ToBroker.TaskSettings['settings']>(
				(resolve, reject) => {
					this.requesterAcceptRejects.set(taskId, {
						accept: resolve as (
							settings: RequesterMessage.ToBroker.TaskSettings['settings'],
						) => void,
						reject,
					});

					// TODO: customisable timeout
					setTimeout(() => {
						reject('Requester timed out');
					}, 2000);
				},
			);

			await this.messageRequester(request.requesterId, {
				type: 'broker:taskready',
				requestId: request.requestId,
				taskId,
			});

			const settings = await acceptPromise;
			await this.sendTaskSettings(task.id, settings);
		} catch (e) {
			if (e instanceof TaskRejectError) {
				await this.cancelTask(task.id, e.reason);
				this.logger.info(`Task (${taskId}) rejected by Requester with reason "${e.reason}"`);
				return;
			}
			await this.cancelTask(task.id, 'Unknown reason');
			throw e;
		}
	}

	// Find matching task offers and requests, then let the runner
	// know that an offer has been accepted
	//
	// *DO NOT MAKE THIS FUNCTION ASYNC*
	// This function relies on never yielding.
	// If you need to make this function async, you'll need to
	// implement some kind of locking for the requests and task
	// lists
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

	taskRequested(request: TaskRequest) {
		this.pendingTaskRequests.push(request);
		this.settleTasks();
	}

	taskOffered(offer: TaskOffer) {
		this.pendingTaskOffers.push(offer);
		this.settleTasks();
	}

	/**
	 * For testing only
	 */

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

	setTasks(tasks: Record<string, Task>) {
		this.tasks = new Map(Object.entries(tasks));
	}

	setPendingTaskOffers(pendingTaskOffers: TaskOffer[]) {
		this.pendingTaskOffers = pendingTaskOffers;
	}

	setPendingTaskRequests(pendingTaskRequests: TaskRequest[]) {
		this.pendingTaskRequests = pendingTaskRequests;
	}

	setRunnerAcceptRejects(
		runnerAcceptRejects: Record<
			string,
			{ accept: RunnerAcceptCallback; reject: TaskRejectCallback }
		>,
	) {
		this.runnerAcceptRejects = new Map(Object.entries(runnerAcceptRejects));
	}
}
