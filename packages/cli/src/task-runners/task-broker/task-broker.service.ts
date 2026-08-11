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
import { TaskRequesterAcceptTimeoutError } from '@/task-runners/task-broker/errors/task-requester-accept-timeout.error';
import { TaskRunnerAcceptTimeoutError } from '@/task-runners/task-broker/errors/task-runner-accept-timeout.error';
import { TaskRunnerExecutionTimeoutError } from '@/task-runners/task-broker/errors/task-runner-execution-timeout.error';
import { TaskRunnerUnreachableError } from '@/task-runners/task-broker/errors/task-runner-unreachable.error';
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

const MAX_REQUEST_TIMEOUT_REFRESHES = 3;

const MAX_CONSECUTIVE_ACCEPT_TIMEOUTS = 3;

export interface TaskRequest {
	requestId: string;
	requesterId: string;
	taskType: string;
	timeout?: NodeJS.Timeout;
	acceptInProgress?: boolean;
	timeoutRefreshes?: number;
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

export type RunnerReachabilityCheck = () => boolean;

@Service()
export class TaskBroker {
	private knownRunners: Map<
		TaskRunner['id'],
		{
			runner: TaskRunner;
			messageCallback: MessageCallback;
			isRunnerReachable: RunnerReachabilityCheck;
		}
	> = new Map();

	private requesters: Map<string, RequesterMessageCallback> = new Map();

	private tasks: Map<Task['id'], Task> = new Map();

	/**
	 * While draining, the broker instructs runners to stop sending task offers, rejects incoming task requests, and waits for active tasks to complete, up to a timeout.
	 */
	private isDraining = false;

	private runnerAcceptRejects: Map<
		Task['id'],
		{ accept: RunnerAcceptCallback; reject: TaskRejectCallback; runnerId: TaskRunner['id'] }
	> = new Map();

	private requesterAcceptRejects: Map<
		Task['id'],
		{ accept: RequesterAcceptCallback; reject: TaskRejectCallback }
	> = new Map();

	private consecutiveAcceptTimeouts: Map<TaskRunner['id'], number> = new Map();

	private pendingTaskOffers: TaskOffer[] = [];

	private pendingTaskRequests: TaskRequest[] = [];

	/** Request IDs that have already logged a task-type mismatch warning */
	private mismatchWarned = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly taskRunnersConfig: TaskRunnersConfig,
		private readonly taskRunnerLifecycleEvents: TaskRunnerLifecycleEvents,
		private readonly globalConfig: GlobalConfig,
	) {
		if (this.taskRunnersConfig.taskTimeout <= 0) {
			throw new UserError('Task timeout must be greater than 0');
		}
		if (this.taskRunnersConfig.taskRequestTimeout <= 0) {
			throw new UserError('Task request timeout must be greater than 0');
		}
		if (this.taskRunnersConfig.taskAcceptTimeout <= 0) {
			throw new UserError('Task accept timeout must be greater than 0');
		}
	}

	private createRequestTimeout(requestId: string): NodeJS.Timeout {
		return setTimeout(() => {
			this.handleRequestTimeout(requestId);
		}, this.taskRunnersConfig.taskRequestTimeout * Time.seconds.toMilliseconds);
	}

	/**
	 * Restarts the request's expiry window, so a request that lost part of its window
	 * to a failure the requester is not responsible for gets a full window for the
	 * next matching attempt. Capped per request, so a runner that keeps offering but
	 * never acknowledges cannot postpone the expiry indefinitely. No-op for a request
	 * that is no longer pending, so an already expired request arms no new timer.
	 */
	private refreshRequestTimeout(request: TaskRequest) {
		const isPending = this.pendingTaskRequests.some((r) => r.requestId === request.requestId);
		const refreshes = request.timeoutRefreshes ?? 0;
		if (isPending && refreshes < MAX_REQUEST_TIMEOUT_REFRESHES) {
			request.timeoutRefreshes = refreshes + 1;
			clearTimeout(request.timeout);
			request.timeout = this.createRequestTimeout(request.requestId);
		}
	}

	private handleRequestTimeout(requestId: string) {
		const requestIndex = this.pendingTaskRequests.findIndex((r) => r.requestId === requestId);
		if (requestIndex === -1) return;

		const request = this.pendingTaskRequests[requestIndex];

		this.flagSilentRunners(request.taskType);

		this.pendingTaskRequests.splice(requestIndex, 1);
		this.mismatchWarned.delete(requestId);

		clearTimeout(request.timeout);

		void this.requesters.get(request.requesterId)?.({
			type: 'broker:requestexpired',
			requestId: request.requestId,
			reason: 'timeout',
		});
	}

	private discardOffers(shouldDiscard: (offer: TaskOffer) => boolean) {
		for (let i = this.pendingTaskOffers.length - 1; i >= 0; i--) {
			if (shouldDiscard(this.pendingTaskOffers[i])) {
				this.pendingTaskOffers.splice(i, 1);
			}
		}
	}

	expireTasks() {
		const now = process.hrtime.bigint();
		this.discardOffers(({ validFor, validUntil }) => validFor !== -1 && validUntil < now);
	}

	private discardOffersFrom(runnerId: TaskRunner['id']) {
		this.discardOffers((offer) => offer.runnerId === runnerId);
	}

	/**
	 * Discards offers from runners that are registered but no longer reachable, as matching
	 * one burns a task request on a runner that can never acknowledge it. Offers from
	 * unregistered runners are kept, since deregistration already discards them.
	 */
	private discardOffersFromUnreachableRunners() {
		this.discardOffers(
			(offer) => this.knownRunners.get(offer.runnerId)?.isRunnerReachable() === false,
		);
	}

	/**
	 * Registers a runner as eligible for task offers. `isRunnerReachable` is consulted
	 * before matching any of its offers, and defaults to always reachable. Registration
	 * outlives reachability: a transport can die while messages it already buffered are
	 * still being delivered, so offers can enter the pool after the runner is gone.
	 */
	registerRunner(
		runner: TaskRunner,
		messageCallback: MessageCallback,
		isRunnerReachable: RunnerReachabilityCheck = () => true,
	) {
		this.knownRunners.set(runner.id, { runner, messageCallback, isRunnerReachable });
		void this.knownRunners.get(runner.id)!.messageCallback({ type: 'broker:runnerregistered' });
	}

	deregisterRunner(runnerId: string, error: Error) {
		this.knownRunners.delete(runnerId);
		this.consecutiveAcceptTimeouts.delete(runnerId);

		this.discardOffersFrom(runnerId);

		for (const [taskId, acceptReject] of this.runnerAcceptRejects) {
			if (acceptReject.runnerId === runnerId) {
				this.handleRunnerReject(
					taskId,
					`The Task Runner (${runnerId}) has disconnected: ${error.message}`,
				);
			}
		}

		this.failTasks(this.getInFlightTaskIds(runnerId), error);
	}

	getInFlightTaskIds(runnerId: TaskRunner['id']): Array<Task['id']> {
		return [...this.tasks.values()]
			.filter((task) => task.runnerId === runnerId)
			.map((task) => task.id);
	}

	failTasks(taskIds: Array<Task['id']>, error: Error) {
		for (const taskId of taskIds) {
			void this.failTask(taskId, error);
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
			this.consecutiveAcceptTimeouts.delete(acceptReject.runnerId);
			acceptReject.accept();
			this.runnerAcceptRejects.delete(taskId);
		}
	}

	handleRunnerReject(taskId: Task['id'], reason: string) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			this.consecutiveAcceptTimeouts.delete(acceptReject.runnerId);
			acceptReject.reject(new TaskRejectError(reason));
			this.runnerAcceptRejects.delete(taskId);
		}
	}

	handleRunnerDeferred(taskId: Task['id']) {
		const acceptReject = this.runnerAcceptRejects.get(taskId);
		if (acceptReject) {
			this.consecutiveAcceptTimeouts.delete(acceptReject.runnerId);
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
					timeout: this.createRequestTimeout(message.requestId),
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
		if (!this.tasks.has(taskId)) return;
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
		if (!this.tasks.has(taskId)) return;
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
		if (!this.tasks.has(taskId)) return;
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

	/**
	 * Stops tracking the task and disarms its execution timeout.
	 * @returns the task that was being tracked, or `undefined` if it was already settled.
	 * @remarks A task's timeout outlives the task itself unless disarmed, so the two are dropped together.
	 */
	private untrackTask(taskId: Task['id']) {
		const task = this.tasks.get(taskId);

		if (task) {
			clearTimeout(task.timeout);
			this.tasks.delete(taskId);
		}

		return task;
	}

	private async cancelTask(taskId: Task['id'], reason: string) {
		const task = this.untrackTask(taskId);

		if (task) {
			await this.messageRunner(task.runnerId, {
				type: 'broker:taskcancel',
				taskId,
				reason,
			});
		}
	}

	private async failTask(taskId: Task['id'], error: Error) {
		const task = this.untrackTask(taskId);

		if (task) {
			// TODO: special message type?
			await this.messageRequester(task.requesterId, {
				type: 'broker:taskerror',
				taskId,
				error,
			});
		}
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
		if (!runner.isRunnerReachable()) {
			const error = new TaskRunnerUnreachableError(taskId, task.runnerId);
			await this.failTask(taskId, error);
			throw error;
		}
		return runner.runner;
	}

	async sendTaskSettings(taskId: Task['id'], settings: unknown) {
		if (!this.tasks.has(taskId)) return;
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
			this.taskRunnerLifecycleEvents.emit('runner:timed-out-during-task', {
				runnerId: task.runnerId,
			});
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
		const task = this.untrackTask(taskId);

		if (task) {
			await this.requesters.get(task.requesterId)?.({
				type: 'broker:taskdone',
				taskId: task.id,
				data,
			});
		}
	}

	async taskErrorHandler(taskId: Task['id'], error: unknown) {
		const task = this.untrackTask(taskId);

		if (task) {
			await this.requesters.get(task.requesterId)?.({
				type: 'broker:taskerror',
				taskId: task.id,
				error,
			});
		}
	}

	async acceptOffer(offer: TaskOffer, request: TaskRequest): Promise<void> {
		const taskId = nanoid(8);
		let runnerAcceptTimer: NodeJS.Timeout | undefined;

		try {
			const acceptPromise = new Promise((resolve, reject) => {
				this.runnerAcceptRejects.set(taskId, {
					accept: resolve as () => void,
					reject,
					runnerId: offer.runnerId,
				});

				runnerAcceptTimer = setTimeout(() => {
					reject(new TaskRunnerAcceptTimeoutError(taskId, offer.runnerId));
				}, this.taskRunnersConfig.taskAcceptTimeout * Time.seconds.toMilliseconds);
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
				this.settleTasks();
				return;
			}
			if (e instanceof TaskDeferredError) {
				this.logger.debug(`Task (${taskId}) deferred until runner is ready`);
				this.refreshRequestTimeout(request);
				return;
			}
			if (e instanceof TaskRunnerAcceptTimeoutError) {
				this.logger.warn(e.message);
				this.runnerAcceptRejects.delete(taskId);
				this.refreshRequestTimeout(request);
				// The runner may have created the task before its acknowledgement timed out,
				// holding one of its concurrency slots until the task's own timeout elapses.
				await this.messageRunner(offer.runnerId, {
					type: 'broker:taskcancel',
					taskId,
					reason: 'Acknowledgement window elapsed',
				});
				// A runner missing the acknowledgement window may be gone without its transport
				// having reported it yet, so its remaining offers cannot be trusted either.
				this.discardOffersFrom(offer.runnerId);
				this.flagRunnerIfUnresponsive(offer.runnerId);
				this.settleTasks();
				return;
			}
			throw e;
		} finally {
			clearTimeout(runnerAcceptTimer);
		}

		clearTimeout(request.timeout);

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
			this.logger.warn(
				`Task request (${request.requestId}) expired while runner (${offer.runnerId}) was accepting task (${taskId}), canceling task`,
			);
			await this.cancelTask(taskId, 'Task request expired');
			return;
		}
		this.pendingTaskRequests.splice(requestIndex, 1);

		let requesterAcceptTimer: NodeJS.Timeout | undefined;

		try {
			const acceptPromise = new Promise<RequesterMessage.ToBroker.TaskSettings['settings']>(
				(resolve, reject) => {
					this.requesterAcceptRejects.set(taskId, {
						accept: resolve as (
							settings: RequesterMessage.ToBroker.TaskSettings['settings'],
						) => void,
						reject,
					});

					requesterAcceptTimer = setTimeout(() => {
						reject(new TaskRequesterAcceptTimeoutError(taskId, request.requesterId));
					}, this.taskRunnersConfig.taskAcceptTimeout * Time.seconds.toMilliseconds);
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
			if (e instanceof TaskRunnerUnreachableError) {
				this.logger.warn(e.message);
				return;
			}
			if (e instanceof TaskRequesterAcceptTimeoutError) {
				this.logger.warn(e.message);
				this.requesterAcceptRejects.delete(taskId);
				await this.cancelTask(task.id, 'Requester took too long to acknowledge the task');
				return;
			}
			await this.cancelTask(task.id, 'Unknown reason');
			throw e;
		} finally {
			clearTimeout(requesterAcceptTimer);
		}
	}

	/**
	 * Counts consecutive acknowledgement timeouts per runner.
	 * Any application-level reply (accept, reject, defer) proves the channel is alive and resets the count.
	 * At the threshold, the runner is reported unresponsive exactly once,
	 * so its transport can be torn down and the runner restarted.
	 */
	private flagRunnerIfUnresponsive(runnerId: TaskRunner['id']) {
		const failures = (this.consecutiveAcceptTimeouts.get(runnerId) ?? 0) + 1;

		if (failures < MAX_CONSECUTIVE_ACCEPT_TIMEOUTS) {
			this.consecutiveAcceptTimeouts.set(runnerId, failures);
		} else {
			this.consecutiveAcceptTimeouts.delete(runnerId);
			this.reportUnresponsive(
				runnerId,
				`failed to acknowledge ${MAX_CONSECUTIVE_ACCEPT_TIMEOUTS} consecutive task acceptances`,
			);
		}
	}

	/**
	 * Reports as unresponsive every reachable runner for `taskType` with no sign of life:
	 * no pending offer, no in-flight task, no acceptance in progress.
	 *
	 * A healthy runner with spare capacity keeps offers pending,
	 * so a request expiring next to a silent runner means the runner's offer loop has stalled
	 * and its transport should be torn down so the runner can be restarted.
	 *
	 * A no-op when no runner is registered, which is normal while a runner is still starting up.
	 */
	private flagSilentRunners(taskType: string) {
		this.expireTasks();

		[...this.knownRunners.values()]
			.filter(({ runner }) => runner.taskTypes.includes(taskType))
			.filter(({ isRunnerReachable }) => isRunnerReachable())
			.filter(({ runner }) => this.isSilent(runner.id))
			.forEach(({ runner }) => {
				this.reportUnresponsive(runner.id, 'sent no task offers while a task request expired');
			});
	}

	/**
	 * Reports a runner as unresponsive, so its transport can be torn down and, in internal
	 * mode, its process force-restarted.
	 *
	 * Reports a runner that is no longer registered too: concurrent acceptances can reach the
	 * timeout threshold after the transport deregistered the runner, and a process that
	 * outlived its transport is exactly what still needs restarting.
	 */
	private reportUnresponsive(runnerId: TaskRunner['id'], cause: string) {
		this.logger.warn(`Runner (${runnerId}) ${cause}, reporting it as unresponsive`);
		this.taskRunnerLifecycleEvents.emit('runner:unresponsive', { runnerId });
	}

	private isSilent(runnerId: TaskRunner['id']) {
		const hasPendingOffer = this.pendingTaskOffers.some((offer) => offer.runnerId === runnerId);
		const hasInFlightTask = this.getInFlightTaskIds(runnerId).length > 0;
		const hasAcceptanceInProgress = [...this.runnerAcceptRejects.values()].some(
			(acceptReject) => acceptReject.runnerId === runnerId,
		);

		return !hasPendingOffer && !hasInFlightTask && !hasAcceptanceInProgress;
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
		this.discardOffersFromUnreachableRunners();

		for (const request of this.pendingTaskRequests) {
			if (request.acceptInProgress) {
				continue;
			}
			const offerIndex = this.pendingTaskOffers.findIndex((o) => o.taskType === request.taskType);
			if (offerIndex === -1) {
				this.warnOnTaskTypeMismatch(request);
				continue;
			}
			const offer = this.pendingTaskOffers[offerIndex];

			request.acceptInProgress = true;
			this.pendingTaskOffers.splice(offerIndex, 1);
			this.mismatchWarned.delete(request.requestId);

			void this.acceptOffer(offer, request);
		}
	}

	private warnOnTaskTypeMismatch(request: TaskRequest) {
		if (this.pendingTaskOffers.length === 0) return;
		if (this.mismatchWarned.has(request.requestId)) return;

		const offerTypes = [...new Set(this.pendingTaskOffers.map((o) => o.taskType))];
		this.logger.warn(
			`No matching task offer for request "${request.requestId}" (type "${request.taskType}"). Available offer types: [${offerTypes.join(', ')}]`,
		);
		this.mismatchWarned.add(request.requestId);
	}

	taskRequested(request: TaskRequest) {
		if (this.isDraining) {
			clearTimeout(request.timeout);
			void this.requesters.get(request.requesterId)?.({
				type: 'broker:requestexpired',
				requestId: request.requestId,
				reason: 'draining',
			});
			return;
		}
		this.pendingTaskRequests.push(request);
		this.settleTasks();
	}

	taskOffered(offer: TaskOffer) {
		this.pendingTaskOffers.push(offer);
		this.settleTasks();
	}

	startDraining() {
		this.isDraining = true;
	}

	hasActiveTasks() {
		return this.tasks.size > 0;
	}

	/**
	 * For testing only
	 */

	stopDraining() {
		this.isDraining = false;
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

	getRequesterAcceptRejects() {
		return this.requesterAcceptRejects;
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
			{ accept: RunnerAcceptCallback; reject: TaskRejectCallback; runnerId: TaskRunner['id'] }
		>,
	) {
		this.runnerAcceptRejects = new Map(Object.entries(runnerAcceptRejects));
	}
}
