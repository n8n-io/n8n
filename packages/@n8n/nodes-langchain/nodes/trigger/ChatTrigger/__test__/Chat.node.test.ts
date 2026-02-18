import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions } from 'n8n-workflow';
import {
	CHAT_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	FREE_TEXT_CHAT_RESPONSE_TYPE,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';

import { Chat } from '../Chat.node';

describe('Test Chat Node', () => {
	let chat: Chat;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		chat = new Chat();
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('v1.0', () => {
		const chatNode = mock<INode>({
			name: 'Chat',
			type: CHAT_NODE_TYPE,
			parameters: {},
			typeVersion: 1.0,
		});

		it('should execute and send message', async () => {
			const items = [{ json: { data: 'test' } }];
			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				limitType: 'afterTimeInterval',
				resumeAmount: 1,
				resumeUnit: 'minutes',
			});
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				{
					type: CHAT_TRIGGER_NODE_TYPE,
					disabled: false,
					parameters: { mode: 'hostedChat', options: { responseMode: 'responseNodes' } },
				} as any,
			]);

			const result = await chat.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: {}, sendMessage: 'message' }]]);
		});

		it('should execute and handle memory connection', async () => {
			const items = [{ json: { data: 'test' } }];
			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ memoryConnection: true });
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				limitType: 'afterTimeInterval',
				resumeAmount: 1,
				resumeUnit: 'minutes',
			});
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				{
					type: CHAT_TRIGGER_NODE_TYPE,
					disabled: false,
					parameters: { mode: 'hostedChat', options: { responseMode: 'responseNodes' } },
				} as any,
			]);

			const memory = { chatHistory: { addAIMessage: jest.fn() } };
			mockExecuteFunctions.getInputConnectionData.mockResolvedValueOnce(memory);

			await chat.execute.call(mockExecuteFunctions);

			expect(memory.chatHistory.addAIMessage).toHaveBeenCalledWith('message');
		});

		it('should execute without memory connection', async () => {
			const items = [{ json: { data: 'test' } }];
			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				limitType: 'afterTimeInterval',
				resumeAmount: 1,
				resumeUnit: 'minutes',
			});
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				{
					type: CHAT_TRIGGER_NODE_TYPE,
					disabled: false,
					parameters: { mode: 'hostedChat', options: { responseMode: 'responseNodes' } },
				} as any,
			]);

			const result = await chat.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: {}, sendMessage: 'message' }]]);
		});

		it('should execute with specified time limit', async () => {
			const items = [{ json: { data: 'test' } }];
			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				limitType: 'atSpecifiedTime',
				maxDateAndTime: new Date().toISOString(),
			});
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				{
					type: CHAT_TRIGGER_NODE_TYPE,
					disabled: false,
					parameters: { mode: 'hostedChat', options: { responseMode: 'responseNodes' } },
				} as any,
			]);

			const result = await chat.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: {}, sendMessage: 'message' }]]);
		});

		it('should process onMessage without waiting for reply', async () => {
			const data = { json: { chatInput: 'user message' } };
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ memoryConnection: true });
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
			mockExecuteFunctions.getInputData.mockReturnValue([data]);
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				{
					type: CHAT_TRIGGER_NODE_TYPE,
					disabled: false,
					parameters: { mode: 'hostedChat', options: { responseMode: 'responseNodes' } },
				} as any,
			]);

			const result = await chat.onMessage(mockExecuteFunctions, data);

			expect(result).toEqual([[data]]);
		});
	});

	describe('v1.1', () => {
		const chatNode = mock<INode>({
			name: 'Chat',
			type: CHAT_NODE_TYPE,
			parameters: {},
			typeVersion: 1.1,
		});

		it('should process onMessage without waiting for reply', async () => {
			const data = { json: { chatInput: 'user message' } };
			mockExecuteFunctions.getInputData.mockReturnValue([data]);
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'operation':
						return 'send';
					case 'options':
						return { memoryConnection: false };
					default:
						return undefined;
				}
			});

			const result = await chat.onMessage(mockExecuteFunctions, data);

			expect(result).toEqual([[data]]);
		});

		it('should process onMessage with waiting for reply and free text response type', async () => {
			const data = { json: { chatInput: 'user message' } };
			mockExecuteFunctions.getInputData.mockReturnValue([data]);
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'operation':
						return SEND_AND_WAIT_OPERATION;
					case 'responseType':
						return FREE_TEXT_CHAT_RESPONSE_TYPE;
					case 'options':
						return { memoryConnection: false };
					default:
						return undefined;
				}
			});

			const result = await chat.onMessage(mockExecuteFunctions, data);

			expect(result).toEqual([
				[
					{
						...data,
						json: {
							data: {
								...data.json,
							},
						},
					},
				],
			]);
		});

		it('should process onMessage with waiting for reply and approval response type', async () => {
			const data = { json: { chatInput: 'user message' } };
			mockExecuteFunctions.getInputData.mockReturnValue([data]);
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'operation':
						return SEND_AND_WAIT_OPERATION;
					case 'responseType':
						return 'approval';
					case 'options':
						return { memoryConnection: false };
					default:
						return undefined;
				}
			});

			const result = await chat.onMessage(mockExecuteFunctions, data);

			expect(result).toEqual([
				[
					{
						...data,
						json: {
							data: {
								...data.json,
								approved: false,
							},
						},
					},
				],
			]);
		});

		it('should add user message to memory', async () => {
			const data = { json: { chatInput: 'user message' } };
			const memory = { chatHistory: { addUserMessage: jest.fn() } };
			mockExecuteFunctions.getInputData.mockReturnValue([data]);
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(memory);
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'operation':
						return SEND_AND_WAIT_OPERATION;
					case 'responseType':
						return FREE_TEXT_CHAT_RESPONSE_TYPE;
					case 'options':
						return { memoryConnection: true };
					default:
						return undefined;
				}
			});

			const result = await chat.onMessage(mockExecuteFunctions, data);

			expect(result).toEqual([
				[
					{
						...data,
						json: {
							data: {
								...data.json,
							},
						},
					},
				],
			]);
			expect(memory.chatHistory.addUserMessage).toHaveBeenCalledWith('user message');
		});

		it('v1.2 should return output data directly without nesting into `data` field (except `approved`)', async () => {
			const chatNode = mock<INode>({
				name: 'Chat',
				type: CHAT_NODE_TYPE,
				parameters: {},
				typeVersion: 1.2,
			});
			const data = { json: { chatInput: 'user message', data: { nested: 'field' } } };
			mockExecuteFunctions.getInputData.mockReturnValue([data]);
			mockExecuteFunctions.getNode.mockReturnValue(chatNode);
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'operation':
						return SEND_AND_WAIT_OPERATION;
					case 'responseType':
						return 'approval';
					case 'options':
						return { memoryConnection: false };
					default:
						return undefined;
				}
			});

			const result = await chat.onMessage(mockExecuteFunctions, data);

			expect(result).toEqual([
				[
					{
						...data,
						json: {
							...data.json,
							data: {
								...data.json.data,
								approved: false,
							},
						},
					},
				],
			]);
		});
	});
});
