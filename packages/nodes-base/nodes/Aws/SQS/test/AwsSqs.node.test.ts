import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { AwsSqs } from '../AwsSqs.node';
import * as GenericFunctions from '../../GenericFunctions';

describe('AwsSqs', () => {
	let node: AwsSqs;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	const awsApiRequestSOAPSpy = jest.spyOn(GenericFunctions, 'awsApiRequestSOAP');

	beforeEach(() => {
		node = new AwsSqs();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node',
			name: 'AWS SQS',
			type: 'n8n-nodes-base.awsSqs',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
			(data: unknown[]) => data.map((d) => ({ json: d })),
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('loadOptions - getQueues', () => {
		it('should return queues from ListQueues response', async () => {
			awsApiRequestSOAPSpy.mockResolvedValue({
				ListQueuesResponse: {
					ListQueuesResult: {
						QueueUrl: [
							'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
							'https://sqs.us-east-1.amazonaws.com/123456789012/other-queue',
						],
					},
				},
			});

			const result = await node.methods.loadOptions.getQueues.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{
					name: 'my-queue',
					value: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
				},
				{
					name: 'other-queue',
					value: 'https://sqs.us-east-1.amazonaws.com/123456789012/other-queue',
				},
			]);
		});

		it('should handle a single queue (non-array)', async () => {
			awsApiRequestSOAPSpy.mockResolvedValue({
				ListQueuesResponse: {
					ListQueuesResult: {
						QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/only-queue',
					},
				},
			});

			const result = await node.methods.loadOptions.getQueues.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{
					name: 'only-queue',
					value: 'https://sqs.us-east-1.amazonaws.com/123456789012/only-queue',
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

			const result = await node.methods.loadOptions.getQueues.call(mockLoadOptionsFunctions);

			expect(result).toEqual([]);
		});
	});

	describe('execute - sendMessage', () => {
		it('should send a message with input data', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { foo: 'bar' } }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'sendMessage',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						sendInputData: true,
						queueType: 'standard',
						options: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			awsApiRequestSOAPSpy.mockResolvedValue({
				SendMessageResponse: {
					SendMessageResult: {
						MessageId: 'msg-123',
						MD5OfMessageBody: 'abc123',
					},
				},
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('Action=SendMessage'),
			);
			expect(result[0][0].json).toEqual({
				MessageId: 'msg-123',
				MD5OfMessageBody: 'abc123',
			});
		});
	});

	describe('execute - deleteMessage', () => {
		it('should delete a message by receipt handle', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'deleteMessage',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						receiptHandle: 'AQEBwJnKyrHigUMZj6rYigCgxla==',
					};
					return params[paramName] ?? fallback;
				},
			);

			awsApiRequestSOAPSpy.mockResolvedValue({
				DeleteMessageResponse: { RequestId: 'req-123' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('Action=DeleteMessage'),
			);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('ReceiptHandle=AQEBwJnKyrHigUMZj6rYigCgxla%3D%3D'),
			);
			expect(result[0][0].json).toEqual({ RequestId: 'req-123' });
		});
	});

	describe('execute - purgeQueue', () => {
		it('should purge all messages from a queue', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'purgeQueue',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					};
					return params[paramName] ?? fallback;
				},
			);

			awsApiRequestSOAPSpy.mockResolvedValue({
				PurgeQueueResponse: { RequestId: 'req-456' },
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('Action=PurgeQueue'),
			);
			expect(result[0][0].json).toEqual({ RequestId: 'req-456' });
		});
	});

	describe('execute - receiveMessage', () => {
		it('should receive messages from a queue', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'receiveMessage',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						maxNumberOfMessages: 2,
						receiveMessageOptions: { visibilityTimeout: 30, waitTimeSeconds: 0 },
					};
					return params[paramName] ?? fallback;
				},
			);

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

			const result = await node.execute.call(mockExecuteFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('Action=ReceiveMessage'),
			);
			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('MaxNumberOfMessages=2'),
			);
			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toEqual({
				MessageId: 'msg-1',
				Body: 'Hello',
				ReceiptHandle: 'handle-1',
			});
		});

		it('should handle single message (non-array)', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'receiveMessage',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						maxNumberOfMessages: 1,
						receiveMessageOptions: {},
					};
					return params[paramName] ?? fallback;
				},
			);

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

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({
				MessageId: 'msg-single',
				Body: 'Single message',
				ReceiptHandle: 'handle-single',
			});
		});

		it('should handle empty queue', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'receiveMessage',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						maxNumberOfMessages: 1,
						receiveMessageOptions: {},
					};
					return params[paramName] ?? fallback;
				},
			);

			awsApiRequestSOAPSpy.mockResolvedValue({
				ReceiveMessageResponse: {
					ReceiveMessageResult: {},
				},
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
		});
	});

	describe('execute - getQueueAttributes', () => {
		it('should get queue attributes and flatten them', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'getQueueAttributes',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						attributeNames: ['All'],
					};
					return params[paramName] ?? fallback;
				},
			);

			awsApiRequestSOAPSpy.mockResolvedValue({
				GetQueueAttributesResponse: {
					GetQueueAttributesResult: {
						Attribute: [
							{ Name: 'ApproximateNumberOfMessages', Value: '5' },
							{ Name: 'QueueArn', Value: 'arn:aws:sqs:us-east-1:123456789012:my-queue' },
							{ Name: 'VisibilityTimeout', Value: '30' },
						],
					},
				},
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(awsApiRequestSOAPSpy).toHaveBeenCalledWith(
				'sqs',
				'GET',
				expect.stringContaining('Action=GetQueueAttributes'),
			);
			expect(result[0][0].json).toEqual({
				ApproximateNumberOfMessages: '5',
				QueueArn: 'arn:aws:sqs:us-east-1:123456789012:my-queue',
				VisibilityTimeout: '30',
			});
		});

		it('should handle single attribute (non-array)', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'getQueueAttributes',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						attributeNames: ['ApproximateNumberOfMessages'],
					};
					return params[paramName] ?? fallback;
				},
			);

			awsApiRequestSOAPSpy.mockResolvedValue({
				GetQueueAttributesResponse: {
					GetQueueAttributesResult: {
						Attribute: { Name: 'ApproximateNumberOfMessages', Value: '10' },
					},
				},
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({
				ApproximateNumberOfMessages: '10',
			});
		});

		it('should handle empty attributes', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'getQueueAttributes',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
						attributeNames: ['All'],
					};
					return params[paramName] ?? fallback;
				},
			);

			awsApiRequestSOAPSpy.mockResolvedValue({
				GetQueueAttributesResponse: {
					GetQueueAttributesResult: {},
				},
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({});
		});
	});

	describe('execute - error handling', () => {
		it('should continue on fail when configured', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'purgeQueue',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					};
					return params[paramName] ?? fallback;
				},
			);
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			awsApiRequestSOAPSpy.mockRejectedValue({
				message: 'SQS Error',
				description: 'Queue not found',
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual({ error: 'Queue not found' });
		});

		it('should throw when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index?: number, fallback?: unknown) => {
					const params: Record<string, unknown> = {
						operation: 'purgeQueue',
						queue: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
					};
					return params[paramName] ?? fallback;
				},
			);
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			awsApiRequestSOAPSpy.mockRejectedValue(new Error('Access denied'));

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
		});
	});
});
