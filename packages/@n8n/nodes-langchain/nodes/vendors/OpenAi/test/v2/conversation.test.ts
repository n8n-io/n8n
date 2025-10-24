import lodashGet from 'lodash/get';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import * as transport from '../../transport';
import * as create from '../../v2/actions/conversation/create.operation';
import * as getOperation from '../../v2/actions/conversation/get.operation';
import * as remove from '../../v2/actions/conversation/remove.operation';
import * as update from '../../v2/actions/conversation/update.operation';

jest.mock('../../transport', () => ({
	apiRequest: jest.fn(),
}));

jest.mock('../../v2/actions/text/helpers/responses', () => ({
	formatInputMessages: jest.fn().mockResolvedValue([
		{
			role: 'user',
			content: [{ type: 'input_text', text: 'Hello' }],
		},
	]),
}));

const createExecuteFunctionsMock = (parameters: IDataObject): IExecuteFunctions => {
	const nodeParameters = parameters;
	return {
		getExecutionCancelSignal() {
			return new AbortController().signal;
		},
		getNodeParameter(parameter: string, _itemIndex: number, defaultValue?: unknown) {
			return lodashGet(nodeParameters, parameter, defaultValue);
		},
		getNode() {
			return {
				id: 'test-node',
				name: 'Test Node',
				type: 'n8n-nodes-langchain.openAi',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			};
		},
		getInputConnectionData() {
			return undefined;
		},
		helpers: {
			prepareBinaryData: jest.fn().mockResolvedValue({
				data: 'base64data',
				mimeType: 'text/plain',
				fileName: 'test.txt',
			}),
			assertBinaryData: jest.fn().mockReturnValue({
				filename: 'test.txt',
				contentType: 'text/plain',
			}),
			getBinaryDataBuffer: jest.fn().mockReturnValue(Buffer.from('test data')),
			binaryToBuffer: jest.fn().mockResolvedValue(Buffer.from('test data')),
		},
	} as unknown as IExecuteFunctions;
};

describe('OpenAI Conversation Operations', () => {
	const mockApiRequest = transport.apiRequest as jest.MockedFunction<typeof transport.apiRequest>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Create Operation', () => {
		it('should create a conversation with messages successfully', async () => {
			const mockResponse = {
				id: 'conv_1234567890',
				object: 'conversation',
				created_at: 1234567890,
				items: [
					{
						id: 'item_1',
						type: 'message',
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
			};

			mockApiRequest.mockResolvedValueOnce(mockResponse);

			const executeFunctions = createExecuteFunctionsMock({
				'messages.values': [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {},
			});

			const result = await create.execute.call(executeFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/conversations', {
				body: {
					items: expect.any(Array),
				},
			});
		});

		it('should create a conversation with metadata', async () => {
			const mockResponse = {
				id: 'conv_1234567890',
				object: 'conversation',
				created_at: 1234567890,
			};

			mockApiRequest.mockResolvedValueOnce(mockResponse);

			const executeFunctions = createExecuteFunctionsMock({
				'messages.values': [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					metadata: '{"custom": "value", "source": "test"}',
				},
			});

			const result = await create.execute.call(executeFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/conversations', {
				body: {
					items: expect.any(Array),
					metadata: { custom: 'value', source: 'test' },
				},
			});
		});

		it('should handle empty metadata gracefully', async () => {
			const mockResponse = {
				id: 'conv_1234567890',
				object: 'conversation',
			};

			mockApiRequest.mockResolvedValueOnce(mockResponse);

			const executeFunctions = createExecuteFunctionsMock({
				'messages.values': [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					metadata: '{}',
				},
			});

			const result = await create.execute.call(executeFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/conversations', {
				body: {
					items: expect.any(Array),
				},
			});
		});

		it('should throw error for invalid JSON metadata', async () => {
			const executeFunctions = createExecuteFunctionsMock({
				'messages.values': [
					{
						role: 'user',
						type: 'text',
						content: 'Hello',
					},
				],
				options: {
					metadata: 'invalid json',
				},
			});

			await expect(create.execute.call(executeFunctions, 0)).rejects.toThrow(
				'Invalid JSON in metadata field',
			);
		});
	});

	describe('Get Operation', () => {
		it('should retrieve a conversation successfully', async () => {
			const mockResponse = {
				id: 'conv_1234567890',
				object: 'conversation',
				created_at: 1234567890,
				items: [
					{
						id: 'item_1',
						type: 'message',
						role: 'user',
						content: [{ type: 'input_text', text: 'Hello' }],
					},
				],
			};

			mockApiRequest.mockResolvedValueOnce(mockResponse);

			const executeFunctions = createExecuteFunctionsMock({
				conversationId: 'conv_1234567890',
			});

			const result = await getOperation.execute.call(executeFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(mockApiRequest).toHaveBeenCalledWith('GET', '/conversations/conv_1234567890');
		});
	});

	describe('Remove Operation', () => {
		it('should delete a conversation successfully', async () => {
			const mockResponse = {
				id: 'conv_1234567890',
				object: 'conversation',
				deleted: true,
			};

			mockApiRequest.mockResolvedValueOnce(mockResponse);

			const executeFunctions = createExecuteFunctionsMock({
				conversationId: 'conv_1234567890',
			});

			const result = await remove.execute.call(executeFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(mockApiRequest).toHaveBeenCalledWith('DELETE', '/conversations/conv_1234567890');
		});
	});

	describe('Update Operation', () => {
		it('should update a conversation with metadata successfully', async () => {
			const mockResponse = {
				id: 'conv_1234567890',
				object: 'conversation',
				updated_at: 1234567890,
				metadata: {
					custom: 'value',
					source: 'test',
				},
			};

			mockApiRequest.mockResolvedValueOnce(mockResponse);

			const executeFunctions = createExecuteFunctionsMock({
				conversationId: 'conv_1234567890',
				metadata: '{"custom": "value", "source": "test"}',
			});

			const result = await update.execute.call(executeFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/conversations/conv_1234567890', {
				body: {
					metadata: { custom: 'value', source: 'test' },
				},
			});
		});

		it('should throw error for invalid JSON metadata', async () => {
			const executeFunctions = createExecuteFunctionsMock({
				conversationId: 'conv_1234567890',
				metadata: 'invalid json',
			});

			await expect(update.execute.call(executeFunctions, 0)).rejects.toThrow(
				'Invalid JSON in metadata field',
			);
		});
	});
});
