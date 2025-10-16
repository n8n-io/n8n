import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as ProcessActions from '../actions/process';
import { Guardrails } from '../Guardrails.node';
import * as ModelHelpers from '../helpers/model';

describe('Guardrails', () => {
	let guardrailsNode: Guardrails;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: jest.Mocked<INode>;
	let mockModel: jest.Mocked<BaseChatModel>;

	beforeEach(() => {
		jest.clearAllMocks();

		guardrailsNode = new Guardrails();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Guardrails Node',
			type: 'n8n-nodes-langchain.guardrails',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		mockModel = mock<BaseChatModel>();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('execute', () => {
		describe('successful execution', () => {
			it('should process single item successfully with routeToFailOutput behavior', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						violationBehavior: 'routeToFailOutput',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy.mockResolvedValue({
					passed: {
						text: 'processed text',
						checks: [{ name: 'test', triggered: false }],
					},
					failed: null,
				});

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(1);
				expect(result[0][0]).toEqual({
					json: {
						text: 'processed text',
						checks: [{ name: 'test', triggered: false }],
					},
					pairedItem: { item: 0 },
				});
				expect(result[1]).toHaveLength(0);
				expect(processSpy).toHaveBeenCalledWith(0, mockModel);
			});

			it('should process single item successfully with throwError behavior', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						violationBehavior: 'throwError',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy.mockResolvedValue({
					passed: {
						text: 'processed text',
						checks: [{ name: 'test', triggered: false }],
					},
					failed: null,
				});

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);
				expect(result[0][0]).toEqual({
					json: {
						text: 'processed text',
						checks: [{ name: 'test', triggered: false }],
					},
					pairedItem: { item: 0 },
				});
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
						violationBehavior: 'routeToFailOutput',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy
					.mockResolvedValueOnce({
						passed: {
							text: 'processed text 1',
							checks: [{ name: 'test1', triggered: false }],
						},
						failed: null,
					})
					.mockResolvedValueOnce({
						passed: {
							text: 'processed text 2',
							checks: [{ name: 'test2', triggered: false }],
						},
						failed: null,
					})
					.mockResolvedValueOnce({
						passed: {
							text: 'processed text 3',
							checks: [{ name: 'test3', triggered: false }],
						},
						failed: null,
					});

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(3);
				expect(result[1]).toHaveLength(0);
				expect(processSpy).toHaveBeenCalledTimes(3);
				expect(processSpy).toHaveBeenNthCalledWith(1, 0, mockModel);
				expect(processSpy).toHaveBeenNthCalledWith(2, 1, mockModel);
				expect(processSpy).toHaveBeenNthCalledWith(3, 2, mockModel);
			});

			it('should handle mixed passed and failed results with routeToFailOutput', async () => {
				const inputData: INodeExecutionData[] = [
					{ json: { test: 'data1' } },
					{ json: { test: 'data2' } },
					{ json: { test: 'data3' } },
				];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						violationBehavior: 'routeToFailOutput',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy
					.mockResolvedValueOnce({
						passed: {
							text: 'processed text 1',
							checks: [{ name: 'test1', triggered: false }],
						},
						failed: null,
					})
					.mockResolvedValueOnce({
						passed: null,
						failed: {
							text: 'failed text 2',
							checks: [{ name: 'test2', triggered: true }],
						},
					})
					.mockResolvedValueOnce({
						passed: {
							text: 'processed text 3',
							checks: [{ name: 'test3', triggered: false }],
						},
						failed: null,
					});

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(2);
				expect(result[1]).toHaveLength(1);

				expect(result[0][0]).toEqual({
					json: {
						text: 'processed text 1',
						checks: [{ name: 'test1', triggered: false }],
					},
					pairedItem: { item: 0 },
				});
				expect(result[0][1]).toEqual({
					json: {
						text: 'processed text 3',
						checks: [{ name: 'test3', triggered: false }],
					},
					pairedItem: { item: 2 },
				});

				expect(result[1][0]).toEqual({
					json: {
						text: 'failed text 2',
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
						violationBehavior: 'throwError',
					};
					return params[paramName];
				});
				mockExecuteFunctions.continueOnFail.mockReturnValue(false);

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				const testError = new NodeOperationError(mockNode, 'Process failed');
				processSpy.mockRejectedValue(testError);

				await expect(guardrailsNode.execute.bind(mockExecuteFunctions)()).rejects.toThrow(
					NodeOperationError,
				);
			});

			it('should handle error gracefully when continueOnFail is true', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						violationBehavior: 'routeToFailOutput',
					};
					return params[paramName];
				});
				mockExecuteFunctions.continueOnFail.mockReturnValue(true);

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				const testError = new Error('Process failed');
				processSpy.mockRejectedValue(testError);

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(0);
				expect(result[1]).toHaveLength(1);
				expect(result[1][0]).toEqual({
					json: { error: 'Process failed' },
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
						violationBehavior: 'routeToFailOutput',
					};
					return params[paramName];
				});
				mockExecuteFunctions.continueOnFail.mockReturnValue(true);

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy
					.mockResolvedValueOnce({
						passed: {
							text: 'processed text 1',
							checks: [{ name: 'test1', triggered: false }],
						},
						failed: null,
					})
					.mockRejectedValueOnce(new Error('Process failed for item 2'))
					.mockResolvedValueOnce({
						passed: {
							text: 'processed text 3',
							checks: [{ name: 'test3', triggered: false }],
						},
						failed: null,
					});

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(2);
				expect(result[1]).toHaveLength(1);

				expect(result[0][0]).toEqual({
					json: {
						text: 'processed text 1',
						checks: [{ name: 'test1', triggered: false }],
					},
					pairedItem: { item: 0 },
				});
				expect(result[0][1]).toEqual({
					json: {
						text: 'processed text 3',
						checks: [{ name: 'test3', triggered: false }],
					},
					pairedItem: { item: 2 },
				});

				expect(result[1][0]).toEqual({
					json: { error: 'Process failed for item 2' },
					pairedItem: { item: 1 },
				});
			});
		});

		describe('output routing', () => {
			it('should return single output array when violationBehavior is throwError', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						violationBehavior: 'throwError',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy.mockResolvedValue({
					passed: {
						text: 'processed text',
						checks: [{ name: 'test', triggered: false }],
					},
					failed: null,
				});

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);
			});

			it('should return two output arrays when violationBehavior is routeToFailOutput', async () => {
				const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

				mockExecuteFunctions.getInputData.mockReturnValue(inputData);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						violationBehavior: 'routeToFailOutput',
					};
					return params[paramName];
				});

				const getChatModelSpy = jest.spyOn(ModelHelpers, 'getChatModel');
				getChatModelSpy.mockResolvedValue(mockModel);

				const processSpy = jest.spyOn(ProcessActions, 'process');
				processSpy.mockResolvedValue({
					passed: {
						text: 'processed text',
						checks: [{ name: 'test', triggered: false }],
					},
					failed: null,
				});

				const result = await guardrailsNode.execute.call(mockExecuteFunctions);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveLength(1);
				expect(result[1]).toHaveLength(0);
			});
		});
	});
});
