import { mock } from 'jest-mock-extended';
import get from 'lodash/get';
import set from 'lodash/set';

import type { EventService } from '@/events/event.service';
import type { NodeTypes } from '@/node-types';
import type { Task } from '@/task-runners/task-managers/task-requester';
import { TaskRequester } from '@/task-runners/task-managers/task-requester';

class TestTaskRequester extends TaskRequester {
	sentMessages: unknown[] = [];

	sendMessage(message: unknown) {
		this.sentMessages.push(message);
	}
}

describe('TaskRequester', () => {
	let instance: TestTaskRequester;
	const mockNodeTypes = mock<NodeTypes>();
	const mockEventService = mock<EventService>();

	beforeEach(() => {
		instance = new TestTaskRequester(mockNodeTypes, mockEventService);
	});

	describe('handleRpc', () => {
		test.each([
			['logNodeOutput', ['hello world']],
			['helpers.assertBinaryData', [0, 'propertyName']],
			['helpers.getBinaryDataBuffer', [0, 'propertyName']],
			['helpers.prepareBinaryData', [Buffer.from('data').toJSON(), 'filename', 'mimetype']],
			['helpers.setBinaryDataBuffer', [{ data: '123' }, Buffer.from('data').toJSON()]],
			['helpers.binaryToString', [Buffer.from('data').toJSON(), 'utf8']],
			['helpers.httpRequest', [{ url: 'http://localhost' }]],
			['helpers.request', [{ url: 'http://localhost' }]],
		])('should handle %s rpc call', async (methodName, args) => {
			const executeFunctions = set({}, methodName.split('.'), jest.fn());

			const mockTask = mock<Task>({
				taskId: 'taskId',
				data: {
					executeFunctions,
				},
			});
			instance.tasks.set('taskId', mockTask);

			await instance.handleRpc('taskId', 'callId', methodName, args);

			expect(instance.sentMessages).toEqual([
				{
					callId: 'callId',
					data: undefined,
					status: 'success',
					taskId: 'taskId',
					type: 'requester:rpcresponse',
				},
			]);
			expect(get(executeFunctions, methodName.split('.'))).toHaveBeenCalledWith(...args);
		});

		it('converts any serialized buffer arguments into buffers', async () => {
			const mockPrepareBinaryData = jest.fn().mockResolvedValue(undefined);
			const mockTask = mock<Task>({
				taskId: 'taskId',
				data: {
					executeFunctions: {
						helpers: {
							prepareBinaryData: mockPrepareBinaryData,
						},
					},
				},
			});
			instance.tasks.set('taskId', mockTask);

			await instance.handleRpc('taskId', 'callId', 'helpers.prepareBinaryData', [
				Buffer.from('data').toJSON(),
				'filename',
				'mimetype',
			]);

			expect(mockPrepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('data'),
				'filename',
				'mimetype',
			);
		});

		describe('errors', () => {
			it('sends method not allowed error if method is not in the allow list', async () => {
				const mockTask = mock<Task>({
					taskId: 'taskId',
					data: {
						executeFunctions: {},
					},
				});
				instance.tasks.set('taskId', mockTask);

				await instance.handleRpc('taskId', 'callId', 'notAllowedMethod', []);

				expect(instance.sentMessages).toEqual([
					{
						callId: 'callId',
						data: 'Method not allowed',
						status: 'error',
						taskId: 'taskId',
						type: 'requester:rpcresponse',
					},
				]);
			});

			it('sends error if method throws', async () => {
				const error = new Error('Test error');
				const mockTask = mock<Task>({
					taskId: 'taskId',
					data: {
						executeFunctions: {
							helpers: {
								assertBinaryData: jest.fn().mockRejectedValue(error),
							},
						},
					},
				});
				instance.tasks.set('taskId', mockTask);

				await instance.handleRpc('taskId', 'callId', 'helpers.assertBinaryData', []);

				expect(instance.sentMessages).toEqual([
					{
						callId: 'callId',
						data: error,
						status: 'error',
						taskId: 'taskId',
						type: 'requester:rpcresponse',
					},
				]);
			});
		});
	});
});
