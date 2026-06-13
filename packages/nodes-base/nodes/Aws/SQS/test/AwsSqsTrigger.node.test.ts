import { mockDeep } from 'jest-mock-extended';
import type { IPollFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { AwsSqsTrigger } from '../AwsSqsTrigger.node';
import * as GenericFunctions from '../../GenericFunctions';

describe('AwsSqsTrigger', () => {
	let trigger: AwsSqsTrigger;
	let mockPollFunctions: jest.Mocked<IPollFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	const awsApiRequestSOAPSpy = jest.spyOn(GenericFunctions, 'awsApiRequestSOAP');

	beforeEach(() => {
		trigger = new AwsSqsTrigger();
		mockPollFunctions = mockDeep<IPollFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();

		mockPollFunctions.getNode.mockReturnValue({
			id: 'test-node',
			name: 'AWS SQS Trigger',
			type: 'n8n-nodes-base.awsSqsTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		(mockPollFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: unknown[]) =>
			data.map((d) => ({ json: d })),
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(trigger.description.displayName).toBe('AWS SQS Trigger');
			expect(trigger.description.name).toBe('awsSqsTrigger');
			expect(trigger.description.group).toEqual(['trigger']);
			expect(trigger.description.version).toBe(1);
			expect(trigger.description.polling).toBe(true);
		});

		it('should have no inputs and one output', () => {
			expect(trigger.description.inputs).toEqual([]);
			expect(trigger.description.outputs).toHaveLength(1);
		});
	});

	describe('loadOptions - getQueues', () => {
		it('should return queues from ListQueues response', async () => {
			awsApiRequestSOAPSpy.mockResolvedValue({
				ListQueuesResponse: {
					ListQueuesResult: {
						QueueUrl: [
							'https://sqs.us-east-1.amazonaws.com/123456789012/queue-a',
							'https://sqs.us-east-1.amazonaws.com/123456789012/queue-b',
						],
					},
				},
			});

			const result = await trigger.methods.loadOptions.getQueues.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{
					name: 'queue-a',
					value: 'https://sqs.us-east-1.amazonaws.com/123456789012/queue-a',
				},
				{
					name: 'queue-b',
					value: 'https://sqs.us-east-1.amazonaws.com/123456789012/queue-b',
				},
			]);
		});

		it('should return empty array when no queues exist', async () => {
			awsApiRequestSOAPSpy.mockResolvedValue({
				ListQueuesResponse: {
					ListQueuesResult: {
						QueueUrl: undefined,
					},
				},
			});

			const result = await trigger.methods.loadOptions.getQueues.call(mockLoadOptionsFunctions);

			expect(result).toEqual([]);
		});
	});

	describe('poll - receive messages', () => {
		beforeEach(() => {
			mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
			mockPollFunctions.getMode.mockReturnValue('trigger');
		});

		it('should receive messages and return them', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 5,
					deleteAfterReceive: false,
					options: { visibilityTimeout: 30, waitTimeSeconds: 0 },
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: [
							{
								MessageId: 'msg-1',
								Body: 'Hello',
								ReceiptHandle: 'handle-1',
							},
							{
								MessageId: 'msg-2',
								Body: 'World',
								ReceiptHandle: 'handle-2',
							},
						],
					},
				},
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('Action=ReceiveMessage'),
			);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('MaxNumberOfMessages=5'),
			);
			expect(result).not.toBeNull();
			expect(result![0]).toHaveLength(2);
		});

		it('should handle a single message (non-array)', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 1,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: {
							MessageId: 'msg-single',
							Body: 'Single message',
							ReceiptHandle: 'handle-single',
						},
					},
				},
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).not.toBeNull();
			expect(result![0]).toHaveLength(1);
		});

		it('should return null when no messages are available', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 1,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {},
				},
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});
	});

	describe('poll - deduplication', () => {
		it('should skip previously processed messages in trigger mode', async () => {
			const staticData: Record<string, unknown> = {
				processedMessageIds: ['msg-1'],
			};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 10,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: [
							{ MessageId: 'msg-1', Body: 'Old', ReceiptHandle: 'h-1' },
							{ MessageId: 'msg-2', Body: 'New', ReceiptHandle: 'h-2' },
						],
					},
				},
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).not.toBeNull();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json).toEqual(expect.objectContaining({ MessageId: 'msg-2' }));
		});

		it('should not deduplicate in manual mode', async () => {
			const staticData: Record<string, unknown> = {
				processedMessageIds: ['msg-1'],
			};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockPollFunctions.getMode.mockReturnValue('manual');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 10,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: [
							{ MessageId: 'msg-1', Body: 'Old', ReceiptHandle: 'h-1' },
							{ MessageId: 'msg-2', Body: 'New', ReceiptHandle: 'h-2' },
						],
					},
				},
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).not.toBeNull();
			expect(result![0]).toHaveLength(2);
		});

		it('should return null when all messages are duplicates', async () => {
			const staticData: Record<string, unknown> = {
				processedMessageIds: ['msg-1', 'msg-2'],
			};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 10,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: [
							{ MessageId: 'msg-1', Body: 'Old1', ReceiptHandle: 'h-1' },
							{ MessageId: 'msg-2', Body: 'Old2', ReceiptHandle: 'h-2' },
						],
					},
				},
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});

		it('should update static data with new message IDs', async () => {
			const staticData: Record<string, unknown> = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 10,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: [
							{ MessageId: 'msg-a', Body: 'A', ReceiptHandle: 'h-a' },
							{ MessageId: 'msg-b', Body: 'B', ReceiptHandle: 'h-b' },
						],
					},
				},
			});

			await trigger.poll.call(mockPollFunctions);

			expect(staticData.processedMessageIds).toEqual(['msg-a', 'msg-b']);
		});
	});

	describe('poll - auto-delete', () => {
		it('should delete messages after receiving when deleteAfterReceive is true', async () => {
			mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 10,
					deleteAfterReceive: true,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: [
							{ MessageId: 'msg-1', Body: 'Hello', ReceiptHandle: 'receipt-1' },
							{ MessageId: 'msg-2', Body: 'World', ReceiptHandle: 'receipt-2' },
						],
					},
				},
			});

			await trigger.poll.call(mockPollFunctions);

			// 1 call for ReceiveMessage + 2 calls for DeleteMessage
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledTimes(3);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('Action=DeleteMessage'),
			);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining(`ReceiptHandle=${encodeURIComponent('receipt-1')}`),
			);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining(`ReceiptHandle=${encodeURIComponent('receipt-2')}`),
			);
		});

		it('should not delete messages when deleteAfterReceive is false', async () => {
			mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 10,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {
						Message: [{ MessageId: 'msg-1', Body: 'Hello', ReceiptHandle: 'receipt-1' }],
					},
				},
			});

			await trigger.poll.call(mockPollFunctions);

			// Only 1 call for ReceiveMessage, no DeleteMessage calls
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('poll - options', () => {
		it('should pass visibility timeout and wait time seconds to API', async () => {
			mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 3,
					deleteAfterReceive: false,
					options: { visibilityTimeout: 60, waitTimeSeconds: 10 },
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {},
				},
			});

			await trigger.poll.call(mockPollFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('VisibilityTimeout=60'),
			);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('WaitTimeSeconds=10'),
			);
		});

		it('should use default values when options are not set', async () => {
			mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 1,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {},
				},
			});

			await trigger.poll.call(mockPollFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('VisibilityTimeout=30'),
			);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('WaitTimeSeconds=0'),
			);
		});
	});

	describe('poll - error handling', () => {
		it('should throw when API request fails', async () => {
			mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
			mockPollFunctions.getMode.mockReturnValue('trigger');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					maxNumberOfMessages: 1,
					deleteAfterReceive: false,
					options: {},
				};
				return params[paramName];
			});

			awsApiRequestSOAPSpy.mockRejectedValue(new Error('Access denied'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow();
		});
	});
});
