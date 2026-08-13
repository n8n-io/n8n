import type { Logger } from '@n8n/backend-common';
import type { TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { BrokerMessage, RunnerMessage, TaskResultData } from '@n8n/task-runner';
import { type INodeTypeBaseDescription } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { TaskRunnerLifecycleEvents } from '@/task-runners/task-runner-lifecycle-events';

import { TaskRejectError } from '../errors/task-reject.error';
import { TaskRequesterAcceptTimeoutError } from '../errors/task-requester-accept-timeout.error';
import { TaskRunnerExecutionTimeoutError } from '../errors/task-runner-execution-timeout.error';
import { TaskRunnerUnreachableError } from '../errors/task-runner-unreachable.error';
import { TaskBroker } from '../task-broker.service';
import type {
	RequesterMessageCallback,
	TaskOffer,
	TaskRequest,
	TaskRunner,
} from '../task-broker.service';

const createValidUntil = (ms: number) => process.hrtime.bigint() + BigInt(ms * 1_000_000);

describe('TaskBroker', () => {
	let taskBroker: TaskBroker;

	beforeEach(() => {
		// real timeout values, so flows that arm timers never call setTimeout(NaN)
		taskBroker = new TaskBroker(
			mock(),
			mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskTimeout: 60, taskAcceptTimeout: 2 }),
			mock(),
			mock(),
		);
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should reject a non-positive task request timeout', () => {
			const config = mock<TaskRunnersConfig>({ taskRequestTimeout: 0 });

			expect(() => new TaskBroker(mock(), config, mock(), mock())).toThrowError(
				'Task request timeout must be greater than 0',
			);
		});

		it('should reject a non-positive task accept timeout', () => {
			const config = mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 0 });

			expect(() => new TaskBroker(mock(), config, mock(), mock())).toThrowError(
				'Task accept timeout must be greater than 0',
			);
		});
	});

	describe('expireTasks', () => {
		it('should remove expired task offers and keep valid task offers', () => {
			const validOffer: TaskOffer = {
				offerId: 'valid',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000), // 1 second in the future
			};

			const expiredOffer1: TaskOffer = {
				offerId: 'expired1',
				runnerId: 'runner2',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(-1000), // 1 second in the past
			};

			const expiredOffer2: TaskOffer = {
				offerId: 'expired2',
				runnerId: 'runner3',
				taskType: 'taskType1',
				validFor: 2000,
				validUntil: createValidUntil(-2000), // 2 seconds in the past
			};

			taskBroker.setPendingTaskOffers([validOffer, expiredOffer1, expiredOffer2]);

			taskBroker.expireTasks();

			const offers = taskBroker.getPendingTaskOffers();

			expect(offers).toHaveLength(1);
			expect(offers[0]).toEqual(validOffer);
		});

		it('should not expire non-expiring task offers', () => {
			const nonExpiringOffer: TaskOffer = {
				offerId: 'nonExpiring',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: -1,
				validUntil: 0n, // sentinel value for non-expiring offer
			};

			const expiredOffer: TaskOffer = {
				offerId: 'expired',
				runnerId: 'runner2',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(-1000), // 1 second in the past
			};

			taskBroker.setPendingTaskOffers([
				nonExpiringOffer, // will not be removed
				expiredOffer, // will be removed
			]);

			taskBroker.expireTasks();

			const offers = taskBroker.getPendingTaskOffers();
			expect(offers).toHaveLength(1);
			expect(offers[0]).toEqual(nonExpiringOffer);
		});
	});

	describe('registerRunner', () => {
		it('should add a runner to known runners', () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const messageCallback = vi.fn();

			taskBroker.registerRunner(runner, messageCallback);

			const knownRunners = taskBroker.getKnownRunners();
			const runnerIds = [...knownRunners.keys()];

			expect(runnerIds).toHaveLength(1);
			expect(runnerIds[0]).toEqual(runnerId);

			expect(knownRunners.get(runnerId)?.runner).toEqual(runner);
			expect(knownRunners.get(runnerId)?.messageCallback).toEqual(messageCallback);
		});

		it('should send node types to runner', () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const messageCallback = vi.fn();

			taskBroker.registerRunner(runner, messageCallback);
		});
	});

	describe('unreachable runners', () => {
		beforeEach(() => {
			// fake timers so the matching flows arm no lingering real timers
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const offerFrom = (runnerId: string): TaskOffer => ({
			offerId: `offer-${runnerId}`,
			runnerId,
			taskType: 'taskType1',
			validFor: 1000,
			validUntil: createValidUntil(1000),
		});

		const requestTaskFrom = (runnerId: string, isRunnerReachable: () => boolean) => {
			const messageCallback = vi.fn();
			taskBroker.registerRunner(
				mock<TaskRunner>({ id: runnerId }),
				messageCallback,
				isRunnerReachable,
			);
			messageCallback.mockClear();
			taskBroker.setPendingTaskOffers([offerFrom(runnerId)]);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			};

			taskBroker.taskRequested(request);

			return { request, messageCallback };
		};

		it('should not match an offer from a registered but unreachable runner', () => {
			const { request, messageCallback } = requestTaskFrom('deadRunner', () => false);

			expect(taskBroker.getPendingTaskOffers()).toHaveLength(0);
			expect(request.acceptInProgress).toBeUndefined();
			expect(messageCallback).not.toHaveBeenCalled();
		});

		it('should still match an offer from a reachable runner', () => {
			const { request, messageCallback } = requestTaskFrom('liveRunner', () => true);

			expect(request.acceptInProgress).toBe(true);
			expect(messageCallback).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:taskofferaccept' }),
			);
		});

		it('should keep offers from runners that are not registered', () => {
			taskBroker.setPendingTaskOffers([offerFrom('unregisteredRunner')]);

			taskBroker.settleTasks();

			expect(taskBroker.getPendingTaskOffers()).toHaveLength(1);
		});

		const setupInFlightTask = (taskId: string, runnerId: string, isReachable: boolean) => {
			const runnerCallback = vi.fn();
			const requesterCallback = vi.fn();

			taskBroker.registerRunner(
				mock<TaskRunner>({ id: runnerId }),
				runnerCallback,
				() => isReachable,
			);
			taskBroker.registerRequester('requester1', requesterCallback);
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId: 'requester1', taskType: 'taskType1' },
			});
			runnerCallback.mockClear();

			return { runnerCallback, requesterCallback };
		};

		it('should fail an in-flight task instead of sending settings to an unreachable runner', async () => {
			const { runnerCallback, requesterCallback } = setupInFlightTask('task1', 'deadRunner', false);

			await expect(taskBroker.sendTaskSettings('task1', {})).rejects.toThrow(
				TaskRunnerUnreachableError,
			);

			expect(runnerCallback).not.toHaveBeenCalled();
			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:taskerror',
				taskId: 'task1',
				error: expect.any(TaskRunnerUnreachableError),
			});
			expect(taskBroker.getTasks().get('task1')).toBeUndefined();

			const [[taskErrorMessage]] = requesterCallback.mock.calls as [
				[{ error: TaskRunnerUnreachableError }],
			];
			expect(taskErrorMessage.error.level).toBe('warning');
		});

		it('should fail an in-flight task instead of relaying a requester response to an unreachable runner', async () => {
			const { runnerCallback, requesterCallback } = setupInFlightTask('task1', 'deadRunner', false);

			await expect(taskBroker.handleRequesterDataResponse('task1', 'req1', {})).rejects.toThrow(
				TaskRunnerUnreachableError,
			);

			expect(runnerCallback).not.toHaveBeenCalled();
			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:taskerror',
				taskId: 'task1',
				error: expect.any(TaskRunnerUnreachableError),
			});
			expect(taskBroker.getTasks().get('task1')).toBeUndefined();
		});

		it('should still send settings to a reachable runner', async () => {
			const { runnerCallback } = setupInFlightTask('task1', 'liveRunner', true);

			await taskBroker.sendTaskSettings('task1', {});

			expect(runnerCallback).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:tasksettings', taskId: 'task1' }),
			);
			expect(taskBroker.getTasks().get('task1')).toBeDefined();
		});

		it('should settle the accept flow gracefully when the runner dies before receiving settings', async () => {
			const loggerMock = mock<Logger>();
			taskBroker = new TaskBroker(
				loggerMock,
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskTimeout: 60, taskAcceptTimeout: 2 }),
				mock(),
				mock(),
			);

			let isReachable = true;
			const runnerCallback = vi.fn((message: BrokerMessage.ToRunner.All) => {
				if (message.type === 'broker:taskofferaccept') {
					taskBroker.handleRunnerAccept(message.taskId);
					isReachable = false; // runner dies right after acknowledging
				}
			});
			const requesterCallback = vi.fn((message: BrokerMessage.ToRequester.All) => {
				if (message.type === 'broker:taskready') {
					taskBroker.handleRequesterAccept(message.taskId, {});
				}
			});

			taskBroker.registerRunner(
				mock<TaskRunner>({ id: 'runner1' }),
				runnerCallback,
				() => isReachable,
			);
			taskBroker.registerRequester('requester1', requesterCallback);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			};
			taskBroker.setPendingTaskRequests([request]);

			await expect(taskBroker.acceptOffer(offerFrom('runner1'), request)).resolves.toBeUndefined();

			expect(runnerCallback).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:tasksettings' }),
			);
			expect(requesterCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'broker:taskerror',
					error: expect.any(TaskRunnerUnreachableError),
				}),
			);
			expect(taskBroker.getTasks().size).toBe(0);
			expect(loggerMock.warn).toHaveBeenCalledWith(
				expect.stringContaining('Runner (runner1) became unreachable while processing task'),
			);
		});
	});

	describe('registerRequester', () => {
		it('should add a requester to known requesters', () => {
			const requesterId = 'requester1';
			const messageCallback = vi.fn();

			taskBroker.registerRequester(requesterId, messageCallback);

			const knownRequesters = taskBroker.getKnownRequesters();
			const requesterIds = [...knownRequesters.keys()];

			expect(requesterIds).toHaveLength(1);
			expect(requesterIds[0]).toEqual(requesterId);

			expect(knownRequesters.get(requesterId)).toEqual(messageCallback);
		});
	});

	describe('deregisterRunner', () => {
		it('should remove a runner from known runners', () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const messageCallback = vi.fn();

			taskBroker.registerRunner(runner, messageCallback);
			taskBroker.deregisterRunner(runnerId, new Error());

			const knownRunners = taskBroker.getKnownRunners();
			const runnerIds = Object.keys(knownRunners);

			expect(runnerIds).toHaveLength(0);
		});

		it('should remove any pending offers for that runner', () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const messageCallback = vi.fn();

			taskBroker.registerRunner(runner, messageCallback);
			taskBroker.taskOffered({
				offerId: 'offer1',
				runnerId,
				taskType: 'mock',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			});
			taskBroker.taskOffered({
				offerId: 'offer2',
				runnerId: 'runner2',
				taskType: 'mock',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			});
			taskBroker.deregisterRunner(runnerId, new Error());

			const offers = taskBroker.getPendingTaskOffers();
			expect(offers).toHaveLength(1);
			expect(offers[0].runnerId).toBe('runner2');
		});

		it('should fail any running tasks for that runner', () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const messageCallback = vi.fn();

			const taskId = 'task1';

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const failSpy = vi.spyOn(taskBroker as any, 'failTask');

			taskBroker.registerRunner(runner, messageCallback);
			taskBroker.setTasks({
				[taskId]: { id: taskId, requesterId: 'requester1', runnerId, taskType: 'mock' },
				task2: { id: 'task2', requesterId: 'requester1', runnerId: 'runner2', taskType: 'mock' },
			});
			const error = new Error('error');
			taskBroker.deregisterRunner(runnerId, error);

			expect(failSpy).toBeCalledWith(taskId, error);
			expect(failSpy).not.toBeCalledWith('task2', expect.anything());
		});
	});

	describe('deregisterRequester', () => {
		it('should remove a requester from known requesters', () => {
			const requesterId = 'requester1';
			const messageCallback = vi.fn();

			taskBroker.registerRequester(requesterId, messageCallback);
			taskBroker.deregisterRequester(requesterId);

			const knownRequesters = taskBroker.getKnownRequesters();
			const requesterIds = Object.keys(knownRequesters);

			expect(requesterIds).toHaveLength(0);
		});
	});

	describe('taskRequested', () => {
		it('should match a pending offer to an incoming request', async () => {
			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			taskBroker.setPendingTaskOffers([offer]);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			};

			vi.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

			taskBroker.taskRequested(request);

			expect(vi.spyOn(taskBroker, 'acceptOffer')).toHaveBeenCalled();
			expect(taskBroker.getPendingTaskOffers()).toHaveLength(0);
		});
	});

	describe('taskOffered', () => {
		it('should match a pending request to an incoming offer', () => {
			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: false,
			};

			taskBroker.setPendingTaskRequests([request]);

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			vi.spyOn(taskBroker, 'acceptOffer').mockResolvedValue(); // allow Vitest to exit cleanly

			taskBroker.taskOffered(offer);

			expect(vi.spyOn(taskBroker, 'acceptOffer')).toHaveBeenCalled();
			expect(taskBroker.getPendingTaskOffers()).toHaveLength(0);
		});
	});

	describe('settleTasks', () => {
		it('should match task offers with task requests by task type', () => {
			const offer1: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			const offer2: TaskOffer = {
				offerId: 'offer2',
				runnerId: 'runner2',
				taskType: 'taskType2',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			const request1: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: false,
			};

			const request2: TaskRequest = {
				requestId: 'request2',
				requesterId: 'requester2',
				taskType: 'taskType2',
				acceptInProgress: false,
			};

			const request3: TaskRequest = {
				requestId: 'request3',
				requesterId: 'requester3',
				taskType: 'taskType3', // will have no match
				acceptInProgress: false,
			};

			taskBroker.setPendingTaskOffers([offer1, offer2]);
			taskBroker.setPendingTaskRequests([request1, request2, request3]);

			const acceptOfferSpy = vi.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

			taskBroker.settleTasks();

			expect(acceptOfferSpy).toHaveBeenCalledTimes(2);
			expect(acceptOfferSpy).toHaveBeenCalledWith(offer1, request1);
			expect(acceptOfferSpy).toHaveBeenCalledWith(offer2, request2);

			const remainingOffers = taskBroker.getPendingTaskOffers();
			expect(remainingOffers).toHaveLength(0);
		});

		it('should not match a request whose acceptance is in progress', () => {
			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};

			taskBroker.setPendingTaskOffers([offer]);
			taskBroker.setPendingTaskRequests([request]);

			const acceptOfferSpy = vi.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

			taskBroker.settleTasks();

			expect(acceptOfferSpy).not.toHaveBeenCalled();

			const remainingOffers = taskBroker.getPendingTaskOffers();
			expect(remainingOffers).toHaveLength(1);
			expect(remainingOffers[0]).toEqual(offer);

			const remainingRequests = taskBroker.getPendingTaskRequests();
			expect(remainingRequests).toHaveLength(1);
			expect(remainingRequests[0]).toEqual(request);
		});

		it('should not create duplicate request when runner defers', async () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });

			// Simulate a launcher-like runner that defers tasks on acceptance
			const messageCallback = vi.fn().mockImplementation(async (message) => {
				if (message.type === 'broker:taskofferaccept') {
					taskBroker.handleRunnerDeferred(message.taskId);
				}
			});

			taskBroker.registerRunner(runner, messageCallback);

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId,
				taskType: 'taskType1',
				validFor: -1,
				validUntil: 0n,
			};

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			};

			taskBroker.setPendingTaskOffers([offer]);
			taskBroker.setPendingTaskRequests([request]);

			taskBroker.settleTasks();

			// Let the async acceptOffer complete
			await new Promise(setImmediate);

			const requests = taskBroker.getPendingTaskRequests();
			expect(requests).toHaveLength(1);
			expect(requests[0].requestId).toBe('request1');
			expect(requests[0].acceptInProgress).toBe(false);
		});

		it('should log warning when offers exist but none match request type', () => {
			const loggerMock = mock<Logger>();
			taskBroker = new TaskBroker(loggerMock, mock(), mock(), mock());

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'python',
				validFor: -1,
				validUntil: 0n,
			};

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'javascript',
				acceptInProgress: false,
			};

			taskBroker.setPendingTaskOffers([offer]);
			taskBroker.setPendingTaskRequests([request]);

			vi.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

			taskBroker.settleTasks();

			expect(loggerMock.warn).toHaveBeenCalledWith(
				expect.stringMatching(/No matching task offer.*request1.*javascript.*python/),
			);
		});

		it('should expire tasks before settling', () => {
			const validOffer: TaskOffer = {
				offerId: 'valid',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000), // 1 second in the future
			};

			const expiredOffer: TaskOffer = {
				offerId: 'expired',
				runnerId: 'runner2',
				taskType: 'taskType2', // will be removed before matching
				validFor: 1000,
				validUntil: createValidUntil(-1000), // 1 second in the past
			};

			const request1: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: false,
			};

			const request2: TaskRequest = {
				requestId: 'request2',
				requesterId: 'requester2',
				taskType: 'taskType2',
				acceptInProgress: false,
			};

			taskBroker.setPendingTaskOffers([validOffer, expiredOffer]);
			taskBroker.setPendingTaskRequests([request1, request2]);

			const acceptOfferSpy = vi.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

			taskBroker.settleTasks();

			expect(acceptOfferSpy).toHaveBeenCalledTimes(1);
			expect(acceptOfferSpy).toHaveBeenCalledWith(validOffer, request1);

			const remainingOffers = taskBroker.getPendingTaskOffers();
			expect(remainingOffers).toHaveLength(0);
		});
	});

	describe('onRunnerMessage', () => {
		it('should handle `runner:taskaccepted` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';

			const message: RunnerMessage.ToBroker.TaskAccepted = {
				type: 'runner:taskaccepted',
				taskId,
			};

			const accept = vi.fn();
			const reject = vi.fn();

			taskBroker.setRunnerAcceptRejects({ [taskId]: { accept, reject, runnerId } });
			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());

			await taskBroker.onRunnerMessage(runnerId, message);

			const runnerAcceptRejects = taskBroker.getRunnerAcceptRejects();

			expect(accept).toHaveBeenCalled();
			expect(reject).not.toHaveBeenCalled();
			expect(runnerAcceptRejects.get(taskId)).toBeUndefined();
		});

		it('should handle `runner:taskrejected` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const rejectionReason = 'Task execution failed';

			const message: RunnerMessage.ToBroker.TaskRejected = {
				type: 'runner:taskrejected',
				taskId,
				reason: rejectionReason,
			};

			const accept = vi.fn();
			const reject = vi.fn();

			taskBroker.setRunnerAcceptRejects({ [taskId]: { accept, reject, runnerId } });
			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());

			await taskBroker.onRunnerMessage(runnerId, message);

			const runnerAcceptRejects = taskBroker.getRunnerAcceptRejects();

			expect(accept).not.toHaveBeenCalled();
			expect(reject).toHaveBeenCalledWith(new TaskRejectError(rejectionReason));
			expect(runnerAcceptRejects.get(taskId)).toBeUndefined();
		});

		it('should handle `runner:taskdone` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const requesterId = 'requester1';
			const data = mock<TaskResultData>();

			const message: RunnerMessage.ToBroker.TaskDone = {
				type: 'runner:taskdone',
				taskId,
				data,
			};

			const requesterMessageCallback = vi.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});
			taskBroker.registerRequester(requesterId, requesterMessageCallback);

			await taskBroker.onRunnerMessage(runnerId, message);

			expect(requesterMessageCallback).toHaveBeenCalledWith({
				type: 'broker:taskdone',
				taskId,
				data,
			});

			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('should handle `runner:taskerror` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const requesterId = 'requester1';
			const errorMessage = 'Task execution failed';

			const message: RunnerMessage.ToBroker.TaskError = {
				type: 'runner:taskerror',
				taskId,
				error: errorMessage,
			};

			const requesterMessageCallback = vi.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});
			taskBroker.registerRequester(requesterId, requesterMessageCallback);

			await taskBroker.onRunnerMessage(runnerId, message);

			expect(requesterMessageCallback).toHaveBeenCalledWith({
				type: 'broker:taskerror',
				taskId,
				error: errorMessage,
			});

			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('should handle `runner:taskdatarequest` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const requesterId = 'requester1';
			const requestId = 'request1';
			const requestParams: RunnerMessage.ToBroker.TaskDataRequest['requestParams'] = {
				dataOfNodes: 'all',
				env: true,
				input: {
					include: true,
				},
				prevNode: true,
			};

			const message: RunnerMessage.ToBroker.TaskDataRequest = {
				type: 'runner:taskdatarequest',
				taskId,
				requestId,
				requestParams,
			};

			const requesterMessageCallback = vi.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});
			taskBroker.registerRequester(requesterId, requesterMessageCallback);

			await taskBroker.onRunnerMessage(runnerId, message);

			expect(requesterMessageCallback).toHaveBeenCalledWith({
				type: 'broker:taskdatarequest',
				taskId,
				requestId,
				requestParams,
			});
		});

		it('should handle `runner:rpc` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const requesterId = 'requester1';
			const callId = 'call1';
			const rpcName = 'helpers.httpRequestWithAuthentication';
			const rpcParams = ['param1', 'param2'];

			const message: RunnerMessage.ToBroker.RPC = {
				type: 'runner:rpc',
				taskId,
				callId,
				name: rpcName,
				params: rpcParams,
			};

			const requesterMessageCallback = vi.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});
			taskBroker.registerRequester(requesterId, requesterMessageCallback);

			await taskBroker.onRunnerMessage(runnerId, message);

			expect(requesterMessageCallback).toHaveBeenCalledWith({
				type: 'broker:rpc',
				taskId,
				callId,
				name: rpcName,
				params: rpcParams,
			});
		});

		it('should handle `runner:nodetypesrequest` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const requesterId = 'requester1';
			const requestId = 'request1';
			const requestParams = [
				{
					name: 'n8n-nodes-base.someNode',
					version: 1,
				},
			];

			const message: RunnerMessage.ToBroker.NodeTypesRequest = {
				type: 'runner:nodetypesrequest',
				taskId,
				requestId,
				requestParams,
			};

			const requesterMessageCallback = vi.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});
			taskBroker.registerRequester(requesterId, requesterMessageCallback);

			await taskBroker.onRunnerMessage(runnerId, message);

			expect(requesterMessageCallback).toHaveBeenCalledWith({
				type: 'broker:nodetypesrequest',
				taskId,
				requestId,
				requestParams,
			});
		});

		it('should handle `runner:taskoffer` message with expiring offer', async () => {
			const runnerId = 'runner1';
			const validFor = 1000; // 1 second
			const message: RunnerMessage.ToBroker.TaskOffer = {
				type: 'runner:taskoffer',
				offerId: 'offer1',
				taskType: 'taskType1',
				validFor,
			};

			const beforeTime = process.hrtime.bigint();
			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());

			await taskBroker.onRunnerMessage(runnerId, message);

			const afterTime = process.hrtime.bigint();

			const offers = taskBroker.getPendingTaskOffers();
			expect(offers).toHaveLength(1);

			const expectedMinValidUntil = beforeTime + BigInt(validFor * 1_000_000);
			const expectedMaxValidUntil = afterTime + BigInt(validFor * 1_000_000);

			expect(offers[0].validUntil).toBeGreaterThanOrEqual(expectedMinValidUntil);
			expect(offers[0].validUntil).toBeLessThanOrEqual(expectedMaxValidUntil);
			expect(offers[0]).toEqual(
				expect.objectContaining({
					runnerId,
					taskType: message.taskType,
					offerId: message.offerId,
					validFor,
				}),
			);
		});

		it('should handle `runner:taskoffer` message with non-expiring offer', async () => {
			const runnerId = 'runner1';
			const message: RunnerMessage.ToBroker.TaskOffer = {
				type: 'runner:taskoffer',
				offerId: 'offer1',
				taskType: 'taskType1',
				validFor: -1,
			};

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());

			await taskBroker.onRunnerMessage(runnerId, message);

			const offers = taskBroker.getPendingTaskOffers();

			expect(offers).toHaveLength(1);
			expect(offers[0]).toEqual({
				runnerId,
				taskType: message.taskType,
				offerId: message.offerId,
				validFor: -1,
				validUntil: 0n,
			});
		});
	});

	describe('onRequesterMessage', () => {
		it('should handle `requester:nodetypesresponse` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const requesterId = 'requester1';
			const requestId = 'request1';
			const nodeTypes = [mock<INodeTypeBaseDescription>(), mock<INodeTypeBaseDescription>()];

			const runnerMessageCallback = vi.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), runnerMessageCallback);
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});

			await taskBroker.handleRequesterNodeTypesResponse(taskId, requestId, nodeTypes);

			expect(runnerMessageCallback).toHaveBeenCalledWith({
				type: 'broker:nodetypes',
				taskId,
				requestId,
				nodeTypes,
			});
		});

		it('should discard `requester:rpcresponse` for an already-cleaned-up task', async () => {
			await expect(
				taskBroker.handleRequesterRpcResponse('nonexistent', 'call1', 'success', {}),
			).resolves.toBeUndefined();
		});

		it('should discard `requester:taskdataresponse` for an already-cleaned-up task', async () => {
			await expect(
				taskBroker.handleRequesterDataResponse('nonexistent', 'req1', {}),
			).resolves.toBeUndefined();
		});

		it('should discard `requester:nodetypesresponse` for an already-cleaned-up task', async () => {
			await expect(
				taskBroker.handleRequesterNodeTypesResponse('nonexistent', 'req1', []),
			).resolves.toBeUndefined();
		});

		it('should discard `sendTaskSettings` for an already-cleaned-up task', async () => {
			await expect(taskBroker.sendTaskSettings('nonexistent', {})).resolves.toBeUndefined();
		});
	});

	describe('task execution timeouts', () => {
		let taskBroker: TaskBroker;
		let config: TaskRunnersConfig;
		const runnerLifecycleEvents = mock<TaskRunnerLifecycleEvents>();

		beforeAll(() => {
			vi.useFakeTimers();
			config = mock<TaskRunnersConfig>({ taskTimeout: 30, mode: 'internal' });
			taskBroker = new TaskBroker(mock(), config, runnerLifecycleEvents, mock());
		});

		afterAll(() => {
			vi.useRealTimers();
		});

		it('on sending task, we should set up task timeout', async () => {
			vi.spyOn(global, 'setTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const runnerMessageCallback = vi.fn();

			taskBroker.registerRunner(runner, runnerMessageCallback);
			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId: 'requester1', taskType: 'test' },
			});

			await taskBroker.sendTaskSettings(taskId, {});

			expect(setTimeout).toHaveBeenCalledWith(
				expect.any(Function),
				config.taskTimeout * Time.seconds.toMilliseconds,
			);
		});

		it('on task completion, we should clear timeout', async () => {
			vi.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const requesterCallback = vi.fn();

			taskBroker.registerRequester(requesterId, requesterCallback);
			taskBroker.setTasks({
				[taskId]: {
					id: taskId,
					runnerId,
					requesterId,
					taskType: 'test',
					timeout: setTimeout(() => {}, config.taskTimeout * Time.seconds.toMilliseconds),
				},
			});

			await taskBroker.taskDoneHandler(taskId, { result: [] });

			expect(clearTimeout).toHaveBeenCalled();
			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('on task error, we should clear timeout', async () => {
			vi.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const requesterCallback = vi.fn();

			taskBroker.registerRequester(requesterId, requesterCallback);
			taskBroker.setTasks({
				[taskId]: {
					id: taskId,
					runnerId,
					requesterId,
					taskType: 'test',
					timeout: setTimeout(() => {}, config.taskTimeout * Time.seconds.toMilliseconds),
				},
			});

			await taskBroker.taskErrorHandler(taskId, new Error('Test error'));

			expect(clearTimeout).toHaveBeenCalled();
			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('on failing a task, we should clear timeout', async () => {
			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';

			taskBroker.registerRequester(requesterId, vi.fn());
			taskBroker.setTasks({
				[taskId]: {
					id: taskId,
					runnerId,
					requesterId,
					taskType: 'test',
					timeout: setTimeout(() => {}, config.taskTimeout * Time.seconds.toMilliseconds),
				},
			});

			const armedTimers = vi.getTimerCount();

			taskBroker.deregisterRunner(runnerId, new Error('Runner died'));
			await Promise.resolve();

			expect(vi.getTimerCount()).toBe(armedTimers - 1);
			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('on cancelling a task, we should clear timeout', async () => {
			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), vi.fn());
			taskBroker.setTasks({
				[taskId]: {
					id: taskId,
					runnerId,
					requesterId,
					taskType: 'test',
					timeout: setTimeout(() => {}, config.taskTimeout * Time.seconds.toMilliseconds),
				},
			});

			const armedTimers = vi.getTimerCount();

			await taskBroker.onRequesterMessage(requesterId, {
				type: 'requester:taskcancel',
				taskId,
				reason: 'Cancelled by requester',
			});

			expect(vi.getTimerCount()).toBe(armedTimers - 1);
			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('[internal mode] on timeout, we should emit `runner:timed-out-during-task` event and send error to requester', async () => {
			vi.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const runnerCallback = vi.fn();
			const requesterCallback = vi.fn();

			taskBroker.registerRunner(runner, runnerCallback);
			taskBroker.registerRequester(requesterId, requesterCallback);

			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});

			await taskBroker.sendTaskSettings(taskId, {});

			vi.runAllTimers();

			await Promise.resolve();

			expect(runnerLifecycleEvents.emit).toHaveBeenCalledWith('runner:timed-out-during-task', {
				runnerId,
			});

			await Promise.resolve();

			expect(clearTimeout).toHaveBeenCalled();

			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:taskerror',
				taskId,
				error: expect.any(TaskRunnerExecutionTimeoutError),
			});

			await Promise.resolve();

			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('[external mode] on timeout, we should instruct the runner to cancel and send error to requester', async () => {
			const config = mock<TaskRunnersConfig>({ taskTimeout: 30, mode: 'external' });
			taskBroker = new TaskBroker(mock(), config, runnerLifecycleEvents, mock());

			vi.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const runnerCallback = vi.fn();
			const requesterCallback = vi.fn();

			taskBroker.registerRunner(runner, runnerCallback);
			taskBroker.registerRequester(requesterId, requesterCallback);

			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});

			await taskBroker.sendTaskSettings(taskId, {});
			runnerCallback.mockClear();

			vi.runAllTimers();

			await Promise.resolve(); // for timeout callback
			await Promise.resolve(); // for sending messages to runner and requester
			await Promise.resolve(); // for task cleanup and removal

			expect(runnerCallback).toHaveBeenLastCalledWith({
				type: 'broker:taskcancel',
				taskId,
				reason: 'Task execution timed out',
			});

			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:taskerror',
				taskId,
				error: expect.any(TaskRunnerExecutionTimeoutError),
			});

			expect(clearTimeout).toHaveBeenCalled();
			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});
	});

	describe('task runner accept timeout', () => {
		const ACCEPT_TIMEOUT_MS = 2100;

		// a failing assertion must not leak fake timers into later tests
		afterEach(() => {
			vi.useRealTimers();
		});

		const offerFor = (runnerId: string, offerId: string): TaskOffer => ({
			offerId,
			runnerId,
			taskType: 'taskType1',
			validFor: 10_000,
			validUntil: createValidUntil(10_000),
		});

		const expectAcceptTimeout = async (offer: TaskOffer, request: TaskRequest) => {
			vi.useFakeTimers();
			const acceptPromise = taskBroker.acceptOffer(offer, request);
			vi.advanceTimersByTime(ACCEPT_TIMEOUT_MS);
			await acceptPromise;
		};

		it('broker should handle timeout when waiting for acknowledgment of offer accept', async () => {
			const loggerMock = mock<Logger>();

			taskBroker = new TaskBroker(
				loggerMock,
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 2 }),
				mock(),
				mock(),
			);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), vi.fn());

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			};

			await expectAcceptTimeout(offerFor('runner1', 'offer1'), request);

			expect(request.acceptInProgress).toBe(false);
			expect(loggerMock.warn).toHaveBeenCalledWith(
				expect.stringContaining('Runner (runner1) took too long to acknowledge acceptance of task'),
			);
		});

		it('should discard the unresponsive runner remaining offers and retry the request', async () => {
			const deadRunnerCallback = vi.fn();
			const liveRunnerCallback = vi.fn();

			taskBroker = new TaskBroker(
				mock<Logger>(),
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 2 }),
				mock(),
				mock(),
			);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'deadRunner' }), deadRunnerCallback);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'liveRunner' }), liveRunnerCallback);

			const matchedOffer = offerFor('deadRunner', 'deadOffer1');
			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};

			taskBroker.setPendingTaskRequests([request]);
			taskBroker.setPendingTaskOffers([
				offerFor('deadRunner', 'deadOffer2'),
				offerFor('liveRunner', 'liveOffer1'),
			]);

			await expectAcceptTimeout(matchedOffer, request);

			expect(taskBroker.getPendingTaskOffers()).toHaveLength(0);
			expect(liveRunnerCallback).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:taskofferaccept', offerId: 'liveOffer1' }),
			);
		});

		it('should release the task on the runner that failed to acknowledge', async () => {
			const runnerCallback = vi.fn();

			taskBroker = new TaskBroker(
				mock<Logger>(),
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 2 }),
				mock(),
				mock(),
			);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), runnerCallback);

			await expectAcceptTimeout(offerFor('runner1', 'offer1'), {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			});

			expect(runnerCallback).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:taskcancel' }),
			);
		});

		it('should stop tracking the acknowledgment that timed out', async () => {
			taskBroker = new TaskBroker(
				mock<Logger>(),
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 2 }),
				mock(),
				mock(),
			);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), vi.fn());

			await expectAcceptTimeout(offerFor('runner1', 'offer1'), {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			});

			expect(taskBroker.getRunnerAcceptRejects().size).toBe(0);
		});

		it('should wait for the configured acknowledgment window before timing out', async () => {
			vi.useFakeTimers();

			const loggerMock = mock<Logger>();
			taskBroker = new TaskBroker(
				loggerMock,
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 5 }),
				mock(),
				mock(),
			);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), vi.fn());

			const acceptPromise = taskBroker.acceptOffer(offerFor('runner1', 'offer1'), {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			});

			vi.advanceTimersByTime(ACCEPT_TIMEOUT_MS);
			expect(loggerMock.warn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(3000);
			await acceptPromise;
			expect(loggerMock.warn).toHaveBeenCalledWith(
				expect.stringContaining('took too long to acknowledge'),
			);
		});

		it('should restart the request expiry window when the runner fails to acknowledge', async () => {
			vi.useFakeTimers();

			const config = mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 2 });
			taskBroker = new TaskBroker(mock(), config, mock(), mock());
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1', taskTypes: [] }), vi.fn());

			const requesterCallback = vi.fn();
			taskBroker.registerRequester('requester1', requesterCallback);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				timeout: taskBroker['createRequestTimeout']('request1'),
				acceptInProgress: true,
			};
			taskBroker.setPendingTaskRequests([request]);

			// most of the window elapses before the matched runner fails to acknowledge
			vi.advanceTimersByTime(55_000);
			const acceptPromise = taskBroker.acceptOffer(offerFor('runner1', 'offer1'), request);
			vi.advanceTimersByTime(ACCEPT_TIMEOUT_MS);
			await acceptPromise;

			// without the restart, the original window would have expired by now
			vi.advanceTimersByTime(30_000);
			expect(taskBroker.getPendingTaskRequests()).toHaveLength(1);

			vi.advanceTimersByTime(60_000);
			expect(taskBroker.getPendingTaskRequests()).toHaveLength(0);
			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:requestexpired',
				requestId: 'request1',
				reason: 'timeout',
			});
		});

		it('should stop restarting the expiry window after repeated acknowledgment failures', async () => {
			vi.useFakeTimers();

			const config = mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 2 });
			taskBroker = new TaskBroker(mock(), config, mock(), mock());
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), vi.fn());

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};
			taskBroker.setPendingTaskRequests([request]);

			const timeoutAfterAcceptFailure = async (offerId: string) => {
				const acceptPromise = taskBroker.acceptOffer(offerFor('runner1', offerId), request);
				vi.advanceTimersByTime(ACCEPT_TIMEOUT_MS);
				await acceptPromise;
				return request.timeout;
			};

			let previousTimeout = await timeoutAfterAcceptFailure('offer1');
			expect(previousTimeout).toBeDefined();

			for (const offerId of ['offer2', 'offer3']) {
				const refreshedTimeout = await timeoutAfterAcceptFailure(offerId);
				expect(refreshedTimeout).not.toBe(previousTimeout);
				previousTimeout = refreshedTimeout;
			}

			expect(await timeoutAfterAcceptFailure('offer4')).toBe(previousTimeout);
		});

		it('should not restart the expiry window when the request already expired', async () => {
			taskBroker = new TaskBroker(
				mock<Logger>(),
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskAcceptTimeout: 2 }),
				mock(),
				mock(),
			);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), vi.fn());

			// the request expired during acceptance, so it is no longer pending
			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};

			await expectAcceptTimeout(offerFor('runner1', 'offer1'), request);

			expect(request.timeoutRefreshes).toBeUndefined();
			expect(request.timeout).toBeUndefined();
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	describe('unresponsive runner detection', () => {
		const ACCEPT_TIMEOUT_MS = 2100;

		let lifecycleEvents: MockProxy<TaskRunnerLifecycleEvents>;

		beforeEach(() => {
			vi.useFakeTimers();
			lifecycleEvents = mock<TaskRunnerLifecycleEvents>();
			taskBroker = new TaskBroker(
				mock(),
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskTimeout: 60, taskAcceptTimeout: 2 }),
				lifecycleEvents,
				mock(),
			);
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), vi.fn());
		});

		// a failing assertion must not leak fake timers into later tests
		afterEach(() => {
			vi.useRealTimers();
		});

		const offerFrom = (runnerId: string): TaskOffer => ({
			offerId: 'offer1',
			runnerId,
			taskType: 'taskType1',
			validFor: 10_000,
			validUntil: createValidUntil(10_000),
		});

		const requestFor = (): TaskRequest => ({
			requestId: 'request1',
			requesterId: 'requester1',
			taskType: 'taskType1',
		});

		const timeOutAcceptance = async (runnerId = 'runner1') => {
			const acceptPromise = taskBroker.acceptOffer(offerFrom(runnerId), requestFor());
			vi.advanceTimersByTime(ACCEPT_TIMEOUT_MS);
			await acceptPromise;
		};

		const answerAcceptance = async (respond: (taskId: string) => void) => {
			const acceptPromise = taskBroker.acceptOffer(offerFrom('runner1'), requestFor());
			const [taskId] = taskBroker.getRunnerAcceptRejects().keys();
			respond(taskId);
			await acceptPromise;
		};

		it('should report a runner unresponsive exactly once at the timeout threshold', async () => {
			await timeOutAcceptance();
			await timeOutAcceptance();
			expect(lifecycleEvents.emit).not.toHaveBeenCalled();

			await timeOutAcceptance();
			expect(lifecycleEvents.emit).toHaveBeenCalledTimes(1);
			expect(lifecycleEvents.emit).toHaveBeenCalledWith('runner:unresponsive', {
				runnerId: 'runner1',
			});

			await timeOutAcceptance();
			expect(lifecycleEvents.emit).toHaveBeenCalledTimes(1);
		});

		it('should reset the count when the runner acknowledges an acceptance', async () => {
			await timeOutAcceptance();
			await timeOutAcceptance();
			await answerAcceptance((taskId) => taskBroker.handleRunnerAccept(taskId));

			await timeOutAcceptance();
			await timeOutAcceptance();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should reset the count when the runner rejects a task', async () => {
			await timeOutAcceptance();
			await timeOutAcceptance();
			await answerAcceptance((taskId) => taskBroker.handleRunnerReject(taskId, 'at capacity'));

			await timeOutAcceptance();
			await timeOutAcceptance();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should reset the count when the runner defers a task', async () => {
			await timeOutAcceptance();
			await timeOutAcceptance();
			await answerAcceptance((taskId) => taskBroker.handleRunnerDeferred(taskId));

			await timeOutAcceptance();
			await timeOutAcceptance();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should clear the count when the runner deregisters', async () => {
			await timeOutAcceptance();
			await timeOutAcceptance();

			taskBroker.deregisterRunner('runner1', new Error('connection lost'));
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), vi.fn());

			await timeOutAcceptance();
			await timeOutAcceptance();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should report a runner that reached the threshold after deregistering', async () => {
			const acceptances = Array.from(
				{ length: 3 },
				async () => await taskBroker.acceptOffer(offerFrom('runner1'), requestFor()),
			);

			// the transport deregisters the runner while the acceptances are still settling,
			// so their timeouts are all counted against a runner no longer known
			vi.advanceTimersByTime(ACCEPT_TIMEOUT_MS);
			taskBroker.deregisterRunner('runner1', new Error('connection lost'));
			await Promise.all(acceptances);

			expect(lifecycleEvents.emit).toHaveBeenCalledWith('runner:unresponsive', {
				runnerId: 'runner1',
			});
		});

		it('should count acknowledgment timeouts per runner', async () => {
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner2' }), vi.fn());

			await timeOutAcceptance('runner1');
			await timeOutAcceptance('runner1');
			await timeOutAcceptance('runner2');
			await timeOutAcceptance('runner2');
			expect(lifecycleEvents.emit).not.toHaveBeenCalled();

			await timeOutAcceptance('runner2');
			expect(lifecycleEvents.emit).toHaveBeenCalledTimes(1);
			expect(lifecycleEvents.emit).toHaveBeenCalledWith('runner:unresponsive', {
				runnerId: 'runner2',
			});
		});
	});

	describe('silent runner detection', () => {
		const REQUEST_TIMEOUT_MS = 60_000;

		let lifecycleEvents: MockProxy<TaskRunnerLifecycleEvents>;
		let requesterCallback: ReturnType<typeof vi.fn<RequesterMessageCallback>>;

		beforeEach(() => {
			vi.useFakeTimers();
			lifecycleEvents = mock<TaskRunnerLifecycleEvents>();
			taskBroker = new TaskBroker(
				mock(),
				mock<TaskRunnersConfig>({ taskRequestTimeout: 60, taskTimeout: 60, taskAcceptTimeout: 2 }),
				lifecycleEvents,
				mock(),
			);
			requesterCallback = vi.fn<RequesterMessageCallback>();
			taskBroker.registerRequester('requester1', requesterCallback);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const registerRunner = (isRunnerReachable?: () => boolean) => {
			taskBroker.registerRunner(
				mock<TaskRunner>({ id: 'runner1', taskTypes: ['taskType1', 'taskType2'] }),
				vi.fn(),
				isRunnerReachable,
			);
		};

		const letRequestExpire = () => {
			taskBroker.taskRequested({
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				timeout: taskBroker['createRequestTimeout']('request1'),
			});
			vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);
		};

		it('should report a reachable runner that sent no offers while a request expired', () => {
			registerRunner();

			letRequestExpire();

			expect(lifecycleEvents.emit).toHaveBeenCalledTimes(1);
			expect(lifecycleEvents.emit).toHaveBeenCalledWith('runner:unresponsive', {
				runnerId: 'runner1',
			});
			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:requestexpired',
				requestId: 'request1',
				reason: 'timeout',
			});
		});

		it('should not report a runner with an in-flight task', () => {
			registerRunner();
			taskBroker.setTasks({
				task1: {
					id: 'task1',
					runnerId: 'runner1',
					requesterId: 'requester1',
					taskType: 'taskType1',
				},
			});

			letRequestExpire();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should not report a runner with a pending task offer', () => {
			registerRunner();
			taskBroker.setPendingTaskOffers([
				{
					offerId: 'offer1',
					runnerId: 'runner1',
					taskType: 'taskType2',
					validFor: 300_000,
					validUntil: createValidUntil(300_000),
				},
			]);

			letRequestExpire();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should not report a runner with a non-expiring launcher offer', () => {
			registerRunner();
			taskBroker.setPendingTaskOffers([
				{
					offerId: 'offer1',
					runnerId: 'runner1',
					taskType: 'taskType2',
					validFor: -1,
					validUntil: 0n,
				},
			]);

			letRequestExpire();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should not report a runner with an acceptance in progress', () => {
			registerRunner();
			taskBroker.setRunnerAcceptRejects({
				task1: { accept: vi.fn(), reject: vi.fn(), runnerId: 'runner1' },
			});

			letRequestExpire();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should not report an unreachable runner', () => {
			registerRunner(() => false);

			letRequestExpire();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should not report a runner that does not support the task type', () => {
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1', taskTypes: ['other'] }), vi.fn());

			letRequestExpire();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
		});

		it('should expire the request without reporting when no runner is registered', () => {
			letRequestExpire();

			expect(lifecycleEvents.emit).not.toHaveBeenCalled();
			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:requestexpired',
				requestId: 'request1',
				reason: 'timeout',
			});
		});
	});

	describe('acceptOffer', () => {
		// a failing assertion must not leak fake timers into later tests
		afterEach(() => {
			vi.useRealTimers();
		});

		const offerFor = (runnerId: string, offerId: string): TaskOffer => ({
			offerId,
			runnerId,
			taskType: 'taskType1',
			validFor: 10_000,
			validUntil: createValidUntil(10_000),
		});

		const acknowledgingRunnerCallback = () =>
			vi.fn((message: BrokerMessage.ToRunner.All) => {
				if (message.type === 'broker:taskofferaccept') {
					taskBroker.handleRunnerAccept(message.taskId);
				}
			});

		it('should cancel the task toward the runner when the request expired during acceptance', async () => {
			const runnerCallback = acknowledgingRunnerCallback();
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), runnerCallback);

			// the request is no longer pending by the time the runner acknowledges
			await taskBroker.acceptOffer(offerFor('runner1', 'offer1'), {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			});

			expect(runnerCallback).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:taskcancel', reason: 'Task request expired' }),
			);
			expect(taskBroker.getTasks().size).toBe(0);
		});

		it('should not leave acknowledgment timers armed after a successful accept flow', async () => {
			vi.useFakeTimers();

			const config = mock<TaskRunnersConfig>({
				taskRequestTimeout: 60,
				taskTimeout: 60,
				taskAcceptTimeout: 2,
			});
			taskBroker = new TaskBroker(mock(), config, mock(), mock());

			const runnerCallback = acknowledgingRunnerCallback();
			const requesterCallback = vi.fn((message: BrokerMessage.ToRequester.All) => {
				if (message.type === 'broker:taskready') {
					taskBroker.handleRequesterAccept(message.taskId, {});
				}
			});
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), runnerCallback);
			taskBroker.registerRequester('requester1', requesterCallback);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};
			taskBroker.setPendingTaskRequests([request]);

			await taskBroker.acceptOffer(offerFor('runner1', 'offer1'), request);

			// only the task execution timeout remains armed
			expect(vi.getTimerCount()).toBe(1);
		});

		it('should cancel the task and stop tracking it when the requester fails to acknowledge', async () => {
			vi.useFakeTimers();

			const runnerCallback = acknowledgingRunnerCallback();
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), runnerCallback);
			taskBroker.registerRequester('requester1', vi.fn());

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};
			taskBroker.setPendingTaskRequests([request]);

			const acceptPromise = taskBroker.acceptOffer(offerFor('runner1', 'offer1'), request);
			await vi.advanceTimersByTimeAsync(2100);
			// resolves instead of leaking the rejection through the void'ed caller
			await acceptPromise;

			expect(taskBroker.getTasks().size).toBe(0);
			expect(taskBroker.getRequesterAcceptRejects().size).toBe(0);
			expect(runnerCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'broker:taskcancel',
					reason: 'Requester took too long to acknowledge the task',
				}),
			);
			expect(new TaskRequesterAcceptTimeoutError('task1', 'requester1').level).toBe('warning');
		});

		it('should stop restarting the expiry window after repeated deferrals', async () => {
			vi.useFakeTimers();

			const deferringRunnerCallback = vi.fn((message: BrokerMessage.ToRunner.All) => {
				if (message.type === 'broker:taskofferaccept') {
					taskBroker.handleRunnerDeferred(message.taskId);
				}
			});
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'runner1' }), deferringRunnerCallback);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};
			taskBroker.setPendingTaskRequests([request]);

			const deferOnce = async (offerId: string) => {
				await taskBroker.acceptOffer(offerFor('runner1', offerId), request);
				return request.timeout;
			};

			let previousTimeout = await deferOnce('offer1');
			expect(previousTimeout).toBeDefined();

			for (const offerId of ['offer2', 'offer3']) {
				const refreshedTimeout = await deferOnce(offerId);
				expect(refreshedTimeout).not.toBe(previousTimeout);
				previousTimeout = refreshedTimeout;
			}

			expect(await deferOnce('offer4')).toBe(previousTimeout);
		});

		it('should reject an acceptance awaiting acknowledgment when its runner deregisters', async () => {
			vi.useFakeTimers();

			const liveRunnerCallback = vi.fn();
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'deadRunner' }), vi.fn());
			taskBroker.registerRunner(mock<TaskRunner>({ id: 'liveRunner' }), liveRunnerCallback);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
				acceptInProgress: true,
			};
			taskBroker.setPendingTaskRequests([request]);
			taskBroker.setPendingTaskOffers([offerFor('liveRunner', 'liveOffer1')]);

			const acceptPromise = taskBroker.acceptOffer(offerFor('deadRunner', 'deadOffer1'), request);
			taskBroker.deregisterRunner('deadRunner', new Error('connection lost'));

			// resolves without the acknowledgment window elapsing
			await acceptPromise;

			const pendingAcceptanceRunnerIds = [...taskBroker.getRunnerAcceptRejects().values()].map(
				({ runnerId }) => runnerId,
			);
			expect(pendingAcceptanceRunnerIds).toEqual(['liveRunner']);
			expect(liveRunnerCallback).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:taskofferaccept', offerId: 'liveOffer1' }),
			);
		});
	});

	describe('request timeout', () => {
		// a failing assertion must not leak fake timers into later tests
		afterEach(() => {
			vi.useRealTimers();
		});

		it('should time out request and send `broker:requestexpired` message', async () => {
			vi.useFakeTimers();

			const requesterId = 'requester1';
			const requesterCallback = vi.fn();

			taskBroker.registerRequester(requesterId, requesterCallback);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId,
				taskType: 'taskType1',
				timeout: taskBroker['createRequestTimeout']('request1'),
			};

			taskBroker.taskRequested(request);

			expect(taskBroker.getPendingTaskRequests()).toHaveLength(1);

			vi.advanceTimersByTime(60 * 1000);

			await Promise.resolve();

			expect(taskBroker.getPendingTaskRequests()).toHaveLength(0);
			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:requestexpired',
				requestId: 'request1',
				reason: 'timeout',
			});
		});

		it('should clear timeout on request matched', async () => {
			vi.useFakeTimers();

			const requesterId = 'requester1';
			const requesterCallback = vi.fn();

			taskBroker.registerRequester(requesterId, requesterCallback);

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			taskBroker.setPendingTaskOffers([offer]);

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId,
				taskType: 'taskType1',
			};

			vi.spyOn(taskBroker, 'acceptOffer').mockImplementation(async (_offer, request) => {
				clearTimeout(request.timeout);
				const requests = taskBroker.getPendingTaskRequests();
				const filtered = requests.filter((r) => r.requestId !== request.requestId);
				taskBroker.setPendingTaskRequests(filtered);
			});

			taskBroker.taskRequested(request);

			await Promise.resolve();
			await Promise.resolve();

			expect(taskBroker.getPendingTaskRequests()).toHaveLength(0);

			vi.advanceTimersByTime(65 * 1000);

			await Promise.resolve();

			expect(requesterCallback).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: 'broker:requestexpired' }),
			);
		});

		it('should reset timeout on request deferred', async () => {
			vi.useFakeTimers();

			const requesterId = 'requester1';
			const requesterCallback = vi.fn();

			taskBroker.registerRequester(requesterId, requesterCallback);

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId,
				taskType: 'taskType1',
			};

			taskBroker.setPendingTaskOffers([offer]);
			taskBroker.setPendingTaskRequests([request]);

			const handleTimeoutSpy = vi.spyOn(taskBroker as any, 'handleRequestTimeout');

			vi.spyOn(taskBroker, 'acceptOffer').mockImplementation(async (_offer, request) => {
				request.acceptInProgress = false;
				clearTimeout(request.timeout);
				request.timeout = taskBroker['createRequestTimeout'](request.requestId);
			});

			taskBroker.settleTasks();

			expect(taskBroker.getPendingTaskRequests()).toHaveLength(1);
			const deferredRequest = taskBroker.getPendingTaskRequests()[0];
			expect(deferredRequest.timeout).toBeDefined();

			vi.advanceTimersByTime(60 * 1000);

			await Promise.resolve();

			expect(handleTimeoutSpy).toHaveBeenCalledWith('request1');
			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:requestexpired',
				requestId: 'request1',
				reason: 'timeout',
			});

			handleTimeoutSpy.mockRestore();
		});
	});
});
