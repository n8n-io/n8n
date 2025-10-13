import { mockDeep } from 'jest-mock-extended';
import { NodeOperationError, type IExecuteFunctions, type INode } from 'n8n-workflow';

import * as image from './image';
import * as text from './text';
import { router } from './router';

jest.mock('./image');
jest.mock('./text');

describe('Ollama Router', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const mockImageExecute = jest.fn();
	const mockTextExecute = jest.fn();

	beforeEach(() => {
		jest.resetAllMocks();
		(image as any).analyze = { execute: mockImageExecute };
		(text as any).message = { execute: mockTextExecute };

		executeFunctionsMock.getInputData.mockReturnValue([
			{ json: { input: 'test1' } },
			{ json: { input: 'test2' } },
		]);
	});

	describe('router', () => {
		it('should route to text.message operation', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'text';
				if (parameter === 'operation') return 'message';
				return undefined;
			});

			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'response1' }, pairedItem: { item: 0 } },
			]);
			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'response2' }, pairedItem: { item: 1 } },
			]);

			const result = await router.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{ json: { result: 'response1' }, pairedItem: { item: 0 } },
					{ json: { result: 'response2' }, pairedItem: { item: 1 } },
				],
			]);
			expect(mockTextExecute).toHaveBeenCalledTimes(2);
			expect(mockTextExecute).toHaveBeenNthCalledWith(1, 0);
			expect(mockTextExecute).toHaveBeenNthCalledWith(2, 1);
		});

		it('should route to image.analyze operation', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'image';
				if (parameter === 'operation') return 'analyze';
				return undefined;
			});

			mockImageExecute.mockResolvedValueOnce([
				{ json: { result: 'image analysis 1' }, pairedItem: { item: 0 } },
			]);
			mockImageExecute.mockResolvedValueOnce([
				{ json: { result: 'image analysis 2' }, pairedItem: { item: 1 } },
			]);

			const result = await router.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{ json: { result: 'image analysis 1' }, pairedItem: { item: 0 } },
					{ json: { result: 'image analysis 2' }, pairedItem: { item: 1 } },
				],
			]);
			expect(mockImageExecute).toHaveBeenCalledTimes(2);
			expect(mockImageExecute).toHaveBeenNthCalledWith(1, 0);
			expect(mockImageExecute).toHaveBeenNthCalledWith(2, 1);
		});

		it('should throw error for unsupported resource', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'unsupported';
				if (parameter === 'operation') return 'test';
				return undefined;
			});

			const mockNode = { name: 'Ollama', type: 'n8n-nodes-langchain.ollama' } as INode;
			executeFunctionsMock.getNode.mockReturnValue(mockNode);

			await expect(router.call(executeFunctionsMock)).rejects.toThrow(NodeOperationError);
			await expect(router.call(executeFunctionsMock)).rejects.toThrow(
				'The resource "unsupported" is not supported!',
			);
		});

		it('should handle execution errors with continueOnFail enabled', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'text';
				if (parameter === 'operation') return 'message';
				return undefined;
			});

			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'success' }, pairedItem: { item: 0 } },
			]);
			mockTextExecute.mockRejectedValueOnce(new Error('API Error'));

			const result = await router.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{ json: { result: 'success' }, pairedItem: { item: 0 } },
					{ json: { error: 'API Error' }, pairedItem: { item: 1 } },
				],
			]);
			expect(mockTextExecute).toHaveBeenCalledTimes(2);
		});

		it('should throw NodeOperationError when continueOnFail is disabled', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'text';
				if (parameter === 'operation') return 'message';
				return undefined;
			});

			executeFunctionsMock.continueOnFail.mockReturnValue(false);
			const mockNode = { name: 'Ollama', type: 'n8n-nodes-langchain.ollama' } as INode;
			executeFunctionsMock.getNode.mockReturnValue(mockNode);

			const originalError = new Error('API Connection Failed');
			mockTextExecute.mockRejectedValueOnce(originalError);

			await expect(router.call(executeFunctionsMock)).rejects.toThrow(NodeOperationError);
		});

		it('should process multiple items and accumulate results', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{ json: { input: 'test1' } },
				{ json: { input: 'test2' } },
				{ json: { input: 'test3' } },
			]);

			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'text';
				if (parameter === 'operation') return 'message';
				return undefined;
			});

			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'response1' }, pairedItem: { item: 0 } },
			]);
			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'response2a' }, pairedItem: { item: 1 } },
				{ json: { result: 'response2b' }, pairedItem: { item: 1 } },
			]);
			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'response3' }, pairedItem: { item: 2 } },
			]);

			const result = await router.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{ json: { result: 'response1' }, pairedItem: { item: 0 } },
					{ json: { result: 'response2a' }, pairedItem: { item: 1 } },
					{ json: { result: 'response2b' }, pairedItem: { item: 1 } },
					{ json: { result: 'response3' }, pairedItem: { item: 2 } },
				],
			]);
			expect(mockTextExecute).toHaveBeenCalledTimes(3);
			expect(mockTextExecute).toHaveBeenNthCalledWith(1, 0);
			expect(mockTextExecute).toHaveBeenNthCalledWith(2, 1);
			expect(mockTextExecute).toHaveBeenNthCalledWith(3, 2);
		});

		it('should handle empty input data', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([]);
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'text';
				if (parameter === 'operation') return 'message';
				return undefined;
			});

			const result = await router.call(executeFunctionsMock);

			expect(result).toEqual([[]]);
			expect(mockTextExecute).not.toHaveBeenCalled();
		});

		it('should handle mixed success and failure with continueOnFail', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{ json: { input: 'test1' } },
				{ json: { input: 'test2' } },
				{ json: { input: 'test3' } },
			]);

			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				if (parameter === 'resource') return 'text';
				if (parameter === 'operation') return 'message';
				return undefined;
			});

			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'success1' }, pairedItem: { item: 0 } },
			]);
			mockTextExecute.mockRejectedValueOnce(new Error('Error in item 2'));
			mockTextExecute.mockResolvedValueOnce([
				{ json: { result: 'success3' }, pairedItem: { item: 2 } },
			]);

			const result = await router.call(executeFunctionsMock);

			expect(result).toEqual([
				[
					{ json: { result: 'success1' }, pairedItem: { item: 0 } },
					{ json: { error: 'Error in item 2' }, pairedItem: { item: 1 } },
					{ json: { result: 'success3' }, pairedItem: { item: 2 } },
				],
			]);
		});
	});
});
