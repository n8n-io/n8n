import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { Chat } from '../Chat.node';

describe('Test Chat Node', () => {
	let chat: Chat;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	const chatNode = mock<INode>({
		name: 'Chat',
		type: CHAT_TRIGGER_NODE_TYPE,
		parameters: {},
	});

	beforeEach(() => {
		chat = new Chat();
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
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

		const memory = { chatHistory: { addAIChatMessage: jest.fn() } };
		mockExecuteFunctions.getInputConnectionData.mockResolvedValueOnce(memory);

		await chat.execute.call(mockExecuteFunctions);

		expect(memory.chatHistory.addAIChatMessage).toHaveBeenCalledWith('message');
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
