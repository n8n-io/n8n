import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type IExecuteFunctions } from 'n8n-workflow';

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

		const result = await chat.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: {}, sendMessage: 'message' }]]);
	});

	it('should process onMessage without waiting for reply', async () => {
		const data = { json: { chatInput: 'user message' } };
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ memoryConnection: true });
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);

		mockExecuteFunctions.getInputData.mockReturnValue([data]);

		const result = await chat.onMessage(mockExecuteFunctions, data);

		expect(result).toEqual([[data]]);
	});
});
