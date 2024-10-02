import { mock } from 'jest-mock-extended';

import { TaskRejectError } from '../errors';
import type { RunnerMessage, TaskResultData } from '../runner-types';
import { TaskBroker } from '../task-broker.service';
import type { TaskOffer, TaskRequest, TaskRunner } from '../task-broker.service';

describe('TaskBroker', () => {
	let taskBroker: TaskBroker;

	beforeEach(() => {
		taskBroker = new TaskBroker(mock());
		jest.restoreAllMocks();
	});

	describe('expireTasks', () => {
		it('should remove expired task offers and keep valid task offers', () => {
			const now = process.hrtime.bigint();

			const validOffer: TaskOffer = {
				offerId: 'valid',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: now + BigInt(1000 * 1_000_000), // 1 second in the future
			};

			const expiredOffer1: TaskOffer = {
				offerId: 'expired1',
				runnerId: 'runner2',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: now - BigInt(1000 * 1_000_000), // 1 second in the past
			};

			const expiredOffer2: TaskOffer = {
				offerId: 'expired2',
				runnerId: 'runner3',
				taskType: 'taskType1',
				validFor: 2000,
				validUntil: now - BigInt(2000 * 1_000_000), // 2 seconds in the past
			};

			taskBroker.setPendingTaskOffers([validOffer, expiredOffer1, expiredOffer2]);

			taskBroker.expireTasks();

			const offers = taskBroker.getPendingTaskOffers();

			expect(offers).toHaveLength(1);
			expect(offers[0]).toEqual(validOffer);
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
			taskBroker.deregisterRunner(runnerId);

			const knownRunners = taskBroker.getKnownRunners();
			const runnerIds = Object.keys(knownRunners);

			expect(runnerIds).toHaveLength(0);
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
			const now = process.hrtime.bigint();

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: now + BigInt(1000 * 1_000_000),
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
			const now = process.hrtime.bigint();

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
				validUntil: now + BigInt(1000 * 1_000_000),
			};

			jest.spyOn(taskBroker, 'acceptOffer').mockResolvedValue(); // allow Jest to exit cleanly

			taskBroker.taskOffered(offer);

			expect(taskBroker.acceptOffer).toHaveBeenCalled();
			expect(taskBroker.getPendingTaskOffers()).toHaveLength(0);
		});
	});

	describe('settleTasks', () => {
		it('should match task offers with task requests by task type', () => {
			const now = process.hrtime.bigint();

			const offer1: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: now + BigInt(1000 * 1_000_000),
			};

			const offer2: TaskOffer = {
				offerId: 'offer2',
				runnerId: 'runner2',
				taskType: 'taskType2',
				validFor: 1000,
				validUntil: now + BigInt(1000 * 1_000_000),
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
			const now = process.hrtime.bigint();

			const offer: TaskOffer = {
				offerId: 'offer1',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: now + BigInt(1000 * 1_000_000),
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
			const now = process.hrtime.bigint();

			const validOffer: TaskOffer = {
				offerId: 'valid',
				runnerId: 'runner1',
				taskType: 'taskType1',
				validFor: 1000,
				validUntil: now + BigInt(1000 * 1_000_000), // 1 second in the future
			};

			const expiredOffer: TaskOffer = {
				offerId: 'expired',
				runnerId: 'runner2',
				taskType: 'taskType2', // will be removed before matching
				validFor: 1000,
				validUntil: now - BigInt(1000 * 1_000_000), // 1 second in the past
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

			const message: RunnerMessage.ToN8n.TaskAccepted = {
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

			const message: RunnerMessage.ToN8n.TaskRejected = {
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

			const message: RunnerMessage.ToN8n.TaskDone = {
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

			const message: RunnerMessage.ToN8n.TaskError = {
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
			const requestType = 'input';
			const param = 'test_param';

			const message: RunnerMessage.ToN8n.TaskDataRequest = {
				type: 'runner:taskdatarequest',
				taskId,
				requestId,
				requestType,
				param,
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
				requestType,
				param,
			});
		});

		it('should handle `runner:rpc` message', async () => {
			const runnerId = 'runner1';
			const taskId = 'task1';
			const requesterId = 'requester1';
			const callId = 'call1';
			const rpcName = 'helpers.httpRequestWithAuthentication';
			const rpcParams = ['param1', 'param2'];

			const message: RunnerMessage.ToN8n.RPC = {
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
	});
});
