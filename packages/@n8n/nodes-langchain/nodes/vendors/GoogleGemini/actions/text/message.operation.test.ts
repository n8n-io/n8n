import type { IExecuteData, IExecuteFunctions, INode } from 'n8n-workflow';
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
		usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
	};

	beforeEach(() => {
		mockReset(executeFunctionsMock);
		const executeData = mock<IExecuteData>({ metadata: {} });
		executeFunctionsMock.getExecuteData.mockReturnValue(executeData);
		executeFunctionsMock.setMetadata.mockImplementation((metadata) => {
			executeData.metadata = metadata;
		});
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
		expect(executeFunctionsMock.setMetadata).toHaveBeenCalledExactlyOnceWith({
			tokenUsage: { inputTokens: 10, outputTokens: 5 },
		});
	});

	it('should reject a successful Gemini 3 Flash response when a Gemma model is configured', async () => {
		// NODE-5773: A successful API response must not hide a different model.
		executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({
			...response,
			modelVersion: 'gemini-3-flash-preview',
		});

		await expect(execute.call(executeFunctionsMock, 0)).rejects.toThrow(NodeOperationError);
		expect(executeFunctionsMock.setMetadata).toHaveBeenCalledExactlyOnceWith({
			tokenUsage: { inputTokens: 10, outputTokens: 5 },
		});
	});

	it.each([
		{ requestedModel: model, modelVersion: model },
		{ requestedModel: model, modelVersion: undefined },
		{ requestedModel: 'models/gemini-2.0-flash', modelVersion: 'gemini-2.0-flash-001' },
		{ requestedModel: 'models/gemini-flash-latest', modelVersion: 'gemini-3-flash-preview' },
	])('should accept $requestedModel with response model $modelVersion', async (testCase) => {
		executeFunctionsMock.getNodeParameter.mockReturnValueOnce(testCase.requestedModel);
		executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({
			...response,
			modelVersion: testCase.modelVersion,
		});

		await expect(execute.call(executeFunctionsMock, 0)).resolves.toEqual([
			{ json: response.candidates[0], pairedItem: { item: 0 } },
		]);
	});

	it('should reject a different model in a tool follow-up response', async () => {
		executeFunctionsMock.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce({
				...response,
				usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 3 },
				candidates: [
					{
						content: {
							parts: [{ functionCall: { name: 'lookup', args: {} } }],
							role: 'model',
						},
					},
				],
			})
			.mockResolvedValueOnce({ ...response, modelVersion: 'gemini-3-flash-preview' });

		await expect(execute.call(executeFunctionsMock, 0)).rejects.toThrow(NodeOperationError);
		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(executeFunctionsMock.setMetadata).toHaveBeenCalledTimes(2);
		expect(executeFunctionsMock.setMetadata).toHaveBeenNthCalledWith(1, {
			tokenUsage: { inputTokens: 20, outputTokens: 3 },
		});
		expect(executeFunctionsMock.setMetadata).toHaveBeenNthCalledWith(2, {
			tokenUsage: { inputTokens: 30, outputTokens: 8 },
		});
	});
});
