import { ChatOpenAI } from '@langchain/openai';
import { mock } from 'jest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatOpenAi } from '../../LmChatOpenAi.node';

jest.mock('@langchain/openai');

describe('LmChatOpenAi Node - extraBody Option', () => {
	let node: LmChatOpenAi;
	let thisArg: ISupplyDataFunctions;
	const TEST_API_KEY = 'test-api-key';

	beforeEach(() => {
		node = new LmChatOpenAi();

		thisArg = mock<ISupplyDataFunctions>({
			getNode: jest.fn().mockReturnValue({
				typeVersion: 1.2,
			}),
			getNodeParameter: jest.fn().mockImplementation((param) => {
				if (param === 'model.value') return 'gpt-4';
				return {};
			}),
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: TEST_API_KEY,
			}),
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should throw error when extraBody is not valid JSON', async () => {
		const invalidExtraBody = '[1,2]';
		thisArg.getNodeParameter = jest.fn().mockImplementation((param) => {
			if (param === 'model.value') return 'gpt-4';
			if (param === 'options')
				return {
					extraBody: invalidExtraBody,
					maxRetries: 1,
					timeout: 2000,
				};
			return {};
		});

		await expect(node.supplyData.call(thisArg, 0)).rejects.toThrow(NodeOperationError);
	});

	it('should merge extraBody with other modelKwargs options', async () => {
		const extraBody = '{"custom_p_1": true, "custom_p_2": "hello"}';
		thisArg.getNodeParameter = jest.fn().mockImplementation((param) => {
			if (param === 'model.value') return 'gpt-4';
			if (param === 'options')
				return {
					extraBody,
					reasoningEffort: 'high',
					maxRetries: 1,
					timeout: 2000,
				};
			return {};
		});

		await node.supplyData.call(thisArg, 0);

		expect(ChatOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				openAIApiKey: TEST_API_KEY,
				modelKwargs: expect.objectContaining({
					custom_p_1: true,
					custom_p_2: 'hello',
					reasoning_effort: 'high',
				}),
			}),
		);
	});
});
