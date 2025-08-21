import type { Logger } from '@n8n/backend-common';
import type { TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { RunnerMessage, TaskResultData } from '@n8n/task-runner';
import { mock } from 'jest-mock-extended';
import { ApplicationError, type INodeTypeBaseDescription } from 'n8n-workflow';

import type { TaskRunnerLifecycleEvents } from '@/task-runners/task-runner-lifecycle-events';

import { TaskRejectError } from '../errors/task-reject.error';
import { TaskRunnerExecutionTimeoutError } from '../errors/task-runner-execution-timeout.error';
import { TaskBroker } from '../task-broker.service';
import type { TaskOffer, TaskRequest, TaskRunner } from '../task-broker.service';

const createValidUntil = (ms: number) => process.hrtime.bigint() + BigInt(ms * 1_000_000);

describe('TaskBroker', () => {
	let taskBroker: TaskBroker;

	beforeEach(() => {
		taskBroker = new TaskBroker(mock(), mock(), mock(), mock());
		jest.restoreAllMocks();
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
			const messageCallback = jest.fn();

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
			const messageCallback = jest.fn();

			taskBroker.registerRunner(runner, messageCallback);
		});
	});

	describe('registerRequester', () => {
		it('should add a requester to known requesters', () => {
			const requesterId = 'requester1';
			const messageCallback = jest.fn();

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
			const messageCallback = jest.fn();

			taskBroker.registerRunner(runner, messageCallback);
			taskBroker.deregisterRunner(runnerId, new Error());

			const knownRunners = taskBroker.getKnownRunners();
			const runnerIds = Object.keys(knownRunners);

			expect(runnerIds).toHaveLength(0);
		});

		it('should remove any pending offers for that runner', () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const messageCallback = jest.fn();

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
			const messageCallback = jest.fn();

			const taskId = 'task1';

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const failSpy = jest.spyOn(taskBroker as any, 'failTask');
			const rejectSpy = jest.spyOn(taskBroker, 'handleRunnerReject');

			taskBroker.registerRunner(runner, messageCallback);
			taskBroker.setTasks({
				[taskId]: { id: taskId, requesterId: 'requester1', runnerId, taskType: 'mock' },
				task2: { id: 'task2', requesterId: 'requester1', runnerId: 'runner2', taskType: 'mock' },
			});
			const error = new Error('error');
			taskBroker.deregisterRunner(runnerId, error);

			expect(failSpy).toBeCalledWith(taskId, error);
			expect(rejectSpy).toBeCalledWith(
				taskId,
				`The Task Runner (${runnerId}) has disconnected: error`,
			);
		});
	});

	describe('deregisterRequester', () => {
		it('should remove a requester from known requesters', () => {
			const requesterId = 'requester1';
			const messageCallback = jest.fn();

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

			jest.spyOn(taskBroker, 'acceptOffer').mockResolvedValue(); // allow Jest to exit cleanly

			taskBroker.taskRequested(request);

			expect(taskBroker.acceptOffer).toHaveBeenCalled();
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

			jest.spyOn(taskBroker, 'acceptOffer').mockResolvedValue(); // allow Jest to exit cleanly

			taskBroker.taskOffered(offer);

			expect(taskBroker.acceptOffer).toHaveBeenCalled();
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

			const acceptOfferSpy = jest.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

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

			const acceptOfferSpy = jest.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

			taskBroker.settleTasks();

			expect(acceptOfferSpy).not.toHaveBeenCalled();

			const remainingOffers = taskBroker.getPendingTaskOffers();
			expect(remainingOffers).toHaveLength(1);
			expect(remainingOffers[0]).toEqual(offer);

			const remainingRequests = taskBroker.getPendingTaskRequests();
			expect(remainingRequests).toHaveLength(1);
			expect(remainingRequests[0]).toEqual(request);
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

			const acceptOfferSpy = jest.spyOn(taskBroker, 'acceptOffer').mockResolvedValue();

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

			const accept = jest.fn();
			const reject = jest.fn();

			taskBroker.setRunnerAcceptRejects({ [taskId]: { accept, reject } });
			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());

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

			const accept = jest.fn();
			const reject = jest.fn();

			taskBroker.setRunnerAcceptRejects({ [taskId]: { accept, reject } });
			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());

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

			const requesterMessageCallback = jest.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());
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

			const requesterMessageCallback = jest.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());
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

			const requesterMessageCallback = jest.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());
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

			const requesterMessageCallback = jest.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());
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

			const requesterMessageCallback = jest.fn();

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());
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
			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());

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

			taskBroker.registerRunner(mock<TaskRunner>({ id: runnerId }), jest.fn());

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

			const runnerMessageCallback = jest.fn();

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
	});

	describe('task execution timeouts', () => {
		let taskBroker: TaskBroker;
		let config: TaskRunnersConfig;
		const runnerLifecycleEvents = mock<TaskRunnerLifecycleEvents>();

		beforeAll(() => {
			jest.useFakeTimers();
			config = mock<TaskRunnersConfig>({ taskTimeout: 30, mode: 'internal' });
			taskBroker = new TaskBroker(mock(), config, runnerLifecycleEvents, mock());
		});

		afterAll(() => {
			jest.useRealTimers();
		});

		it('on sending task, we should set up task timeout', async () => {
			jest.spyOn(global, 'setTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const runnerMessageCallback = jest.fn();

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
			jest.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const requesterCallback = jest.fn();

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
			jest.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const requesterCallback = jest.fn();

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

		it('[internal mode] on timeout, we should emit `runner:timed-out-during-task` event and send error to requester', async () => {
			jest.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const runnerCallback = jest.fn();
			const requesterCallback = jest.fn();

			taskBroker.registerRunner(runner, runnerCallback);
			taskBroker.registerRequester(requesterId, requesterCallback);

			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});

			await taskBroker.sendTaskSettings(taskId, {});

			jest.runAllTimers();

			await Promise.resolve();

			expect(runnerLifecycleEvents.emit).toHaveBeenCalledWith('runner:timed-out-during-task');

			await Promise.resolve();

			expect(clearTimeout).toHaveBeenCalled();

			expect(requesterCallback).toHaveBeenCalledWith({
				type: 'broker:taskerror',
				taskId,
				error: new ApplicationError(`Task execution timed out after ${config.taskTimeout} seconds`),
			});

			await Promise.resolve();

			expect(taskBroker.getTasks().get(taskId)).toBeUndefined();
		});

		it('[external mode] on timeout, we should instruct the runner to cancel and send error to requester', async () => {
			const config = mock<TaskRunnersConfig>({ taskTimeout: 30, mode: 'external' });
			taskBroker = new TaskBroker(mock(), config, runnerLifecycleEvents, mock());

			jest.spyOn(global, 'clearTimeout');

			const taskId = 'task1';
			const runnerId = 'runner1';
			const requesterId = 'requester1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const runnerCallback = jest.fn();
			const requesterCallback = jest.fn();

			taskBroker.registerRunner(runner, runnerCallback);
			taskBroker.registerRequester(requesterId, requesterCallback);

			taskBroker.setTasks({
				[taskId]: { id: taskId, runnerId, requesterId, taskType: 'test' },
			});

			await taskBroker.sendTaskSettings(taskId, {});
			runnerCallback.mockClear();

			jest.runAllTimers();

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
		it('broker should handle timeout when waiting for acknowledgment of offer accept', async () => {
			const runnerId = 'runner1';
			const runner = mock<TaskRunner>({ id: runnerId });
			const messageCallback = jest.fn();
			const loggerMock = mock<Logger>();

			taskBroker = new TaskBroker(loggerMock, mock(), mock(), mock());
			taskBroker.registerRunner(runner, messageCallback);

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId,
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: createValidUntil(1000),
			};

			const request: TaskRequest = {
				requestId: 'request1',
				requesterId: 'requester1',
				taskType: 'taskType1',
			};

			jest.useFakeTimers();

			const acceptPromise = taskBroker.acceptOffer(offer, request);

			jest.advanceTimersByTime(2100);

			await acceptPromise;

			expect(request.acceptInProgress).toBe(false);
			expect(loggerMock.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					`Runner (${runnerId}) took too long to acknowledge acceptance of task`,
				),
			);

			jest.useRealTimers();
		});
	});
});
