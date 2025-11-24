import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as ProcessActions from '../actions/process';
import * as ModelHelpers from '../helpers/model';
import { execute } from '../actions/execute';

describe('Guardrails', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: jest.Mocked<INode>;
	let mockModel: jest.Mocked<BaseChatModel>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Guardrails Node',
			type: 'n8n-nodes-langchain.guardrails',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});
		mockModel = mock<BaseChatModel>();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('execute', () => {
		describe('successful execution', () => {
			it('should process single item successfully', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'classify',
						guardrails: {
							nsfw: {
								value: {
									threshold: 0.5,
								},
							},
						},
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy.mockResolvedValue({
					guardrailsInput: 'processed text',
					passed: {
						checks: [{ name: 'nsfw', triggered: false }],
					},
					failed: null,
				});
				const result = await execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(1);
				expect(result[0][0]).toEqual({
					json: {
						guardrailsInput: 'processed text',
						checks: [{ name: 'nsfw', triggered: false }],
					},
					pairedItem: { item: 0 },
				});
				expect(result[1]).toHaveLength(0);
				expect(processSpy).toHaveBeenCalledWith(0, mockModel);
			});

			it('should process multiple items successfully', async () => {
				const inputData: INodeExecutionData[] = [
					{ json: { test: 'data1' } },
					{ json: { test: 'data2' } },
					{ json: { test: 'data3' } },
				];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'classify',
						guardrails: {
							nsfw: {
								value: {
									threshold: 0.5,
								},
							},
						},
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy
					.mockResolvedValueOnce({
						guardrailsInput: 'processed text 1',
						passed: {
							checks: [{ name: 'test1', triggered: false }],
						},
						failed: null,
					})
					.mockResolvedValueOnce({
						guardrailsInput: 'processed text 2',
						passed: {
							checks: [{ name: 'test2', triggered: false }],
						},
						failed: null,
					})
					.mockResolvedValueOnce({
						guardrailsInput: 'processed text 3',
						passed: {
							checks: [{ name: 'test3', triggered: false }],
						},
						failed: null,
					});

				const result = await execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(3);
				expect(result[1]).toHaveLength(0);
				expect(processSpy).toHaveBeenCalledTimes(3);
				expect(processSpy).toHaveBeenNthCalledWith(1, 0, mockModel);
				expect(processSpy).toHaveBeenNthCalledWith(2, 1, mockModel);
				expect(processSpy).toHaveBeenNthCalledWith(3, 2, mockModel);
			});

			it('should handle mixed passed and failed results when operation is classify', async () => {
				const inputData: INodeExecutionData[] = [
					{ json: { test: 'data1' } },
					{ json: { test: 'data2' } },
					{ json: { test: 'data3' } },
				];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'classify',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy
					.mockResolvedValueOnce({
						guardrailsInput: 'processed text 1',
						passed: {
							checks: [{ name: 'test1', triggered: false }],
						},
						failed: null,
					})
					.mockResolvedValueOnce({
						guardrailsInput: 'failed text 2',
						passed: null,
						failed: {
							checks: [{ name: 'test2', triggered: true }],
						},
					})
					.mockResolvedValueOnce({
						guardrailsInput: 'processed text 3',
						passed: {
							checks: [{ name: 'test3', triggered: false }],
						},
						failed: null,
					});

				const result = await execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(2);
				expect(result[1]).toHaveLength(1);

				expect(result[0][0]).toEqual({
					json: {
						guardrailsInput: 'processed text 1',
						checks: [{ name: 'test1', triggered: false }],
					},
					pairedItem: { item: 0 },
				});
				expect(result[0][1]).toEqual({
					json: {
						guardrailsInput: 'processed text 3',
						checks: [{ name: 'test3', triggered: false }],
					},
					pairedItem: { item: 2 },
				});

				expect(result[1][0]).toEqual({
					json: {
						guardrailsInput: 'failed text 2',
						checks: [{ name: 'test2', triggered: true }],
					},
					pairedItem: { item: 1 },
				});
			});
		});

		describe('error handling', () => {
			it('should throw error when process fails and continueOnFail is false', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'sanitize',
					};
					return params[paramName];
				});
				mockExecuteFunctions.continueOnFail.mockReturnValue(false);

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				const testError = new NodeOperationError(mockNode, 'Process failed');
				processSpy.mockRejectedValue(testError);

				await expect(execute.bind(mockExecuteFunctions)()).rejects.toThrow(NodeOperationError);
			});

			it('should handle error gracefully when continueOnFail is true', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'classify',
					};
					return params[paramName];
				});
				mockExecuteFunctions.continueOnFail.mockReturnValue(true);

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				const testError = new Error('Process failed');
				processSpy.mockRejectedValue(testError);

				const result = await execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(0);
				expect(result[1]).toHaveLength(1);
				expect(result[1][0]).toEqual({
					json: { error: 'Process failed', guardrailsInput: '' },
					pairedItem: { item: 0 },
				});
			});

			it('should handle mixed success and error with continueOnFail true', async () => {
				const inputData: INodeExecutionData[] = [
					{ json: { test: 'data1' } },
					{ json: { test: 'data2' } },
					{ json: { test: 'data3' } },
				];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'classify',
					};
					return params[paramName];
				});
				mockExecuteFunctions.continueOnFail.mockReturnValue(true);

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy
					.mockResolvedValueOnce({
						guardrailsInput: 'processed text 1',
						passed: {
							checks: [{ name: 'test1', triggered: false }],
						},
						failed: null,
					})
					.mockRejectedValueOnce(new Error('Process failed for item 2'))
					.mockResolvedValueOnce({
						guardrailsInput: 'processed text 3',
						passed: {
							checks: [{ name: 'test3', triggered: false }],
						},
						failed: null,
					});

				const result = await execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(2);
				expect(result[1]).toHaveLength(1);

				expect(result[0][0]).toEqual({
					json: {
						guardrailsInput: 'processed text 1',
						checks: [{ name: 'test1', triggered: false }],
					},
					pairedItem: { item: 0 },
				});
				expect(result[0][1]).toEqual({
					json: {
						guardrailsInput: 'processed text 3',
						checks: [{ name: 'test3', triggered: false }],
					},
					pairedItem: { item: 2 },
				});

				expect(result[1][0]).toEqual({
					json: { error: 'Process failed for item 2', guardrailsInput: '' },
					pairedItem: { item: 1 },
				});
			});
		});

		describe('output routing', () => {
			it('should return single output array when operation is sanitize', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'sanitize',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy.mockResolvedValue({
					guardrailsInput: 'processed text',
					passed: {
						checks: [{ name: 'test', triggered: false }],
					},
					failed: null,
				});

				const result = await execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);
			});

			it('should return two output arrays when operation is classify', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						operation: 'classify',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy.mockResolvedValue({
					guardrailsInput: 'processed text',
					passed: {
						checks: [{ name: 'test', triggered: false }],
					},
					failed: null,
				});

				const result = await execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(1);
				expect(result[1]).toHaveLength(0);
			});
		});
	});
});
