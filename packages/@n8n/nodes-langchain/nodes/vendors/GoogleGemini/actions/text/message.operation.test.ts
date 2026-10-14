import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep, mockReset } from 'vitest-mock-extended';

import { execute } from './message.operation';

describe('Google Gemini message model identity', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const model = 'models/gemma-4-26b-a4b-it';
	const response = {
		candidates: [
			{
				content: {
					parts: [{ text: 'Hello, world!' }],
					role: 'model',
				},
				finishReason: 'STOP',
			},
		],
		modelVersion: 'gemma-4-26b-a4b-it',
	};

	beforeEach(() => {
		mockReset(executeFunctionsMock);
		executeFunctionsMock.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
		executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }]);
		executeFunctionsMock.getCredentials.mockResolvedValue({});
		executeFunctionsMock.getNodeParameter.mockImplementation((parameter, _itemIndex, fallback) => {
			switch (parameter) {
				case 'modelId':
					return model;
				case 'messages.values':
					return [{ role: 'user', content: 'Hello, world!' }];
				default:
					return fallback;
			}
		});
	});

	it('should preserve the configured Gemma model and accept a matching response', async () => {
		executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue(response);

		const result = await execute.call(executeFunctionsMock, 0);

		expect(executeFunctionsMock.getNodeParameter).toHaveBeenCalledWith('modelId', 0, '', {
			extractValue: true,
		});
		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'googlePalmApi',
			expect.objectContaining({
				method: 'POST',
				url: 'https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent',
				body: expect.objectContaining({
					contents: [{ role: 'user', parts: [{ text: 'Hello, world!' }] }],
				}),
			}),
		);
		expect(result).toEqual([{ json: response.candidates[0], pairedItem: { item: 0 } }]);
	});

	it('should reject a successful Gemini 3 Flash response when a Gemma model is configured', async () => {
		// NODE-5773: A successful API response must not hide a different model.
		executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({
			...response,
			modelVersion: 'gemini-3-flash-preview',
		});

		await expect(execute.call(executeFunctionsMock, 0)).rejects.toThrow(NodeOperationError);
	});
});
