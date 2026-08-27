import type { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import get from 'lodash/get';
import set from 'lodash/set';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { NodeTypes } from '@/node-types';
import { TaskCancelledError } from '@/task-runners/errors/task-cancelled.error';
import { TaskRequestTimeoutError } from '@/task-runners/errors/task-request-timeout.error';
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
	const mockTaskRunnersConfig = mock<TaskRunnersConfig>();
	const mockGlobalConfig = mock<GlobalConfig>();
	const mockErrorReporter = mock<ErrorReporter>();

	beforeEach(() => {
		instance = new TestTaskRequester(
			mockNodeTypes,
			mockEventService,
			mockTaskRunnersConfig,
			mockGlobalConfig,
			mockErrorReporter,
		);
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
			const executeFunctions = set({}, methodName.split('.'), vi.fn());

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
			const mockPrepareBinaryData = vi.fn().mockResolvedValue(undefined);
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
								assertBinaryData: vi.fn().mockRejectedValue(error),
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

	describe('cancelTasks', () => {
		it('rejects pending tasks with TaskCancelledError when their execution is cancelled', async () => {
			const taskId = 'taskId';
			const executionId = 'executionId';

			const mockTask = mock<Task>({ taskId });
			instance.tasks.set(taskId, mockTask);

			let capturedRejection: unknown;
			const pending = new Promise((_, reject) => {
				instance.taskAcceptRejects.set(taskId, {
					accept: vi.fn(),
					reject: (reason) => {
						capturedRejection = reason;
						reject(reason);
					},
				});
			});

			(
				instance as unknown as { executionIdsToTaskIds: Map<string, Set<string>> }
			).executionIdsToTaskIds.set(executionId, new Set([taskId]));

			instance.cancelTasks(executionId);

			await expect(pending).rejects.toBeInstanceOf(TaskCancelledError);
			expect(capturedRejection).toBeInstanceOf(TaskCancelledError);
		});
	});

	describe('requestExpired', () => {
		it('rejects with TaskRequestTimeoutError including workflow/execution/node IDs and reports them', async () => {
			const requestId = 'requestId';
			const workflowId = 'workflowId';
			const executionId = 'executionId';
			const nodeId = 'nodeId';
			const taskType = 'javascript';

			mockGlobalConfig.deployment = { type: 'default' } as GlobalConfig['deployment'];
			mockTaskRunnersConfig.taskRequestTimeout = 60;

			let capturedRejection: unknown;
			const pending = new Promise((_, reject) => {
				instance.requestAcceptRejects.set(requestId, {
					accept: vi.fn(),
					reject: (reason) => {
						capturedRejection = reason;
						reject(reason);
					},
					requestedAt: Date.now() - 5_000,
					workflowId,
					executionId,
					nodeId,
					taskType,
				});
			});

			instance.requestExpired(requestId);

			await expect(pending).rejects.toBeInstanceOf(TaskRequestTimeoutError);
			expect(capturedRejection).toBeInstanceOf(TaskRequestTimeoutError);
			expect((capturedRejection as TaskRequestTimeoutError).extra).toMatchObject({
				requestId,
				workflowId,
				executionId,
				nodeId,
				taskType,
				elapsedSeconds: expect.any(Number),
			});
			expect((capturedRejection as TaskRequestTimeoutError).shouldReport).toBe(true);
			expect((capturedRejection as TaskRequestTimeoutError).level).toBe('error');
			expect(mockErrorReporter.error).toHaveBeenCalledWith(
				capturedRejection,
				expect.objectContaining({
					executionId,
					extra: expect.objectContaining({
						timeout: 60,
						deploymentType: 'default',
					}),
					tags: {
						issue: 'task-runners-timeouts',
					},
				}),
			);
			expect(instance.requestAcceptRejects.has(requestId)).toBe(false);
		});
	});
});
