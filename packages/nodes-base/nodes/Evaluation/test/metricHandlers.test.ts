import { mock } from 'jest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode, AssignmentCollectionValue } from 'n8n-workflow';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';

import { metricHandlers } from '../utils/metricHandlers';

// Mock the validateEntry function
jest.mock('../../Set/v2/helpers/utils', () => ({
	validateEntry: jest.fn((name: string, _type: string, value: any) => ({
		name,
		value,
	})),
}));

describe('metricHandlers', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.evaluation',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('customMetrics', () => {
		it('should process valid custom metrics', async () => {
			const metricsData: AssignmentCollectionValue = {
				assignments: [
					{ id: '1', name: 'Metric1', value: 5, type: 'number' },
					{ id: '2', name: 'Metric2', value: '10', type: 'number' },
					{ id: '3', name: 'Metric3', value: 7.5, type: 'number' },
				],
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(metricsData);

			const result = await metricHandlers.customMetrics.call(mockExecuteFunctions, 0);

			expect(result).toEqual({
				Metric1: 5,
				Metric2: 10,
				Metric3: 7.5,
			});
		});

		it('should throw error for non-numeric values', async () => {
			const metricsData: AssignmentCollectionValue = {
				assignments: [{ id: '1', name: 'Metric1', value: 'not-a-number', type: 'number' }],
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(metricsData);

			await expect(metricHandlers.customMetrics.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for missing metric name', async () => {
			const metricsData: AssignmentCollectionValue = {
				assignments: [{ id: '1', name: '', value: 5, type: 'number' }],
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(metricsData);

			await expect(metricHandlers.customMetrics.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle empty assignments array', async () => {
			const metricsData: AssignmentCollectionValue = {
				assignments: [],
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(metricsData);

			const result = await metricHandlers.customMetrics.call(mockExecuteFunctions, 0);

			expect(result).toEqual({});
		});

		it('should handle undefined assignments', async () => {
			const metricsData: AssignmentCollectionValue = { assignments: [] };

			mockExecuteFunctions.getNodeParameter.mockReturnValue(metricsData);

			const result = await metricHandlers.customMetrics.call(mockExecuteFunctions, 0);

			expect(result).toEqual({});
		});
	});

	describe('toolsUsed', () => {
		it('should return correct tool usage metrics', async () => {
			const expectedTools = 'calculator, search';
			const intermediateSteps = [
				{ action: { tool: 'calculator' } },
				{ action: { tool: 'calculator' } },
				{ action: { tool: 'search' } },
			];

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedTools') return expectedTools;
				if (paramName === 'intermediateSteps') return intermediateSteps;
				if (paramName === 'options.metricName') return 'Tools Used';
				return undefined;
			});

			const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

			expect(result).toEqual({
				'Tools Used': 1,
			});
		});

		it('should return 0 for unused tools', async () => {
			const expectedTools = 'calculator, search';
			const intermediateSteps = [{ action: { tool: 'calculator' } }];

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedTools') return expectedTools;
				if (paramName === 'intermediateSteps') return intermediateSteps;
				if (paramName === 'options.metricName') return 'Tools Used';
				return undefined;
			});

			const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

			expect(result).toEqual({
				'Tools Used': 0.5,
			});
		});

		it('should handle tool names with spaces and special characters', async () => {
			const expectedTools = 'Get Events, Send Email, Search Database';
			const intermediateSteps = [
				{ action: { tool: 'Get_Events' } },
				{ action: { tool: 'Send_Email' } },
				{ action: { tool: 'Search_Database' } },
			];

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedTools') return expectedTools;
				if (paramName === 'intermediateSteps') return intermediateSteps;
				if (paramName === 'options.metricName') return 'Tools Used';
				return undefined;
			});

			const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

			expect(result).toEqual({
				'Tools Used': 1,
			});
		});

		it('should work case-insensitively', async () => {
			const expectedTools = 'Get Events, send email, SEARCH DATABASE';
			const intermediateSteps = [
				{ action: { tool: 'get_events' } },
				{ action: { tool: 'SEND_EMAIL' } },
				{ action: { tool: 'Search_Database' } },
			];

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedTools') return expectedTools;
				if (paramName === 'intermediateSteps') return intermediateSteps;
				if (paramName === 'options.metricName') return 'Tools Used';
				return undefined;
			});

			const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

			expect(result).toEqual({
				'Tools Used': 1,
			});
		});

		it('should handle mixed case and format variations', async () => {
			const expectedTools = 'calculator tool, Search Engine, data-processor';
			const intermediateSteps = [
				{ action: { tool: 'Calculator_Tool' } },
				{ action: { tool: 'search_engine' } },
				// data-processor is not used, so partial match
			];

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedTools') return expectedTools;
				if (paramName === 'intermediateSteps') return intermediateSteps;
				if (paramName === 'options.metricName') return 'Tools Used';
				return undefined;
			});

			const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

			// 2 out of 3 tools used = 2/3 ≈ 0.6667
			expect(result).toEqual({
				'Tools Used': 2 / 3,
			});
		});

		it('should throw error for missing expected tools', async () => {
			const expectedTools = '';
			const intermediateSteps: any[] = [];

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedTools') return expectedTools;
				if (paramName === 'intermediateSteps') return intermediateSteps;
				return undefined;
			});

			await expect(metricHandlers.toolsUsed.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for undefined expected tools', async () => {
			const expectedTools = undefined;
			const intermediateSteps: any[] = [];

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedTools') return expectedTools;
				if (paramName === 'intermediateSteps') return intermediateSteps;
				return undefined;
			});

			await expect(metricHandlers.toolsUsed.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		describe('intermediate steps validation', () => {
			it('should throw error for missing intermediate steps parameter', async () => {
				const expectedTools = 'calculator';

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return undefined;
					return undefined;
				});

				await expect(metricHandlers.toolsUsed.call(mockExecuteFunctions, 0)).rejects.toThrow(
					new NodeOperationError(mockNode, 'Intermediate steps missing', {
						description:
							"Make sure to enable returning intermediate steps in your agent node's options, then map them in here",
					}),
				);
			});

			it('should throw error for empty object intermediate steps', async () => {
				const expectedTools = 'calculator';
				const intermediateSteps = {};

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return intermediateSteps;
					return undefined;
				});

				await expect(metricHandlers.toolsUsed.call(mockExecuteFunctions, 0)).rejects.toThrow(
					NodeOperationError,
				);
			});

			it('should throw error for string intermediate steps', async () => {
				const expectedTools = 'calculator';
				const intermediateSteps = 'not an array';

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return intermediateSteps;
					return undefined;
				});

				await expect(metricHandlers.toolsUsed.call(mockExecuteFunctions, 0)).rejects.toThrow(
					NodeOperationError,
				);
			});

			it('should throw error for null intermediate steps', async () => {
				const expectedTools = 'calculator';
				const intermediateSteps = null;

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return intermediateSteps;
					return undefined;
				});

				await expect(metricHandlers.toolsUsed.call(mockExecuteFunctions, 0)).rejects.toThrow(
					NodeOperationError,
				);
			});

			it('should handle empty array intermediate steps gracefully', async () => {
				const expectedTools = 'calculator, search';
				const intermediateSteps: any[] = [];

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return intermediateSteps;
					if (paramName === 'options.metricName') return 'Tools Used';
					return undefined;
				});

				const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

				expect(result).toEqual({
					'Tools Used': 0,
				});
			});

			it('should handle malformed intermediate steps objects', async () => {
				const expectedTools = 'calculator, search';
				const intermediateSteps = [
					{ action: { tool: 'calculator' } }, // valid
					{ action: {} }, // missing tool property
					{ notAction: { tool: 'search' } }, // wrong structure
					{}, // completely empty
				];

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return intermediateSteps;
					if (paramName === 'options.metricName') return 'Tools Used';
					return undefined;
				});

				const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

				// Only 'calculator' should match (1 out of 2 expected tools)
				expect(result).toEqual({
					'Tools Used': 0.5,
				});
			});

			it('should handle intermediate steps with null/undefined tool names', async () => {
				const expectedTools = 'calculator, search';
				const intermediateSteps = [
					{ action: { tool: 'calculator' } }, // valid
					{ action: { tool: null } }, // null tool
					{ action: { tool: undefined } }, // undefined tool
					{ action: { tool: '' } }, // empty string tool
				];

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return intermediateSteps;
					if (paramName === 'options.metricName') return 'Tools Used';
					return undefined;
				});

				const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

				// Only 'calculator' should match (1 out of 2 expected tools)
				expect(result).toEqual({
					'Tools Used': 0.5,
				});
			});

			it('should handle intermediate steps with non-string tool names', async () => {
				const expectedTools = 'calculator, search';
				const intermediateSteps = [
					{ action: { tool: 'calculator' } }, // valid
					{ action: { tool: 123 } }, // number
					{ action: { tool: { name: 'search' } } }, // object
					{ action: { tool: ['search'] } }, // array
				];

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'expectedTools') return expectedTools;
					if (paramName === 'intermediateSteps') return intermediateSteps;
					if (paramName === 'options.metricName') return 'Tools Used';
					return undefined;
				});

				// This should not throw an error, but might have unexpected behavior
				// depending on how the comparison works
				const result = await metricHandlers.toolsUsed.call(mockExecuteFunctions, 0);

				// Only 'calculator' should match reliably (1 out of 2 expected tools)
				expect(result).toEqual({
					'Tools Used': 0.5,
				});
			});
		});
	});

	describe('categorization', () => {
		it('should return 1 for exact match', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'expected answer';
				if (paramName === 'actualAnswer') return 'expected answer';
				if (paramName === 'options.metricName') return 'Categorization';
				return undefined;
			});

			const result = await metricHandlers.categorization.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ Categorization: 1 });
		});

		it('should return 0 for non-match', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'expected answer';
				if (paramName === 'actualAnswer') return 'different answer';
				if (paramName === 'options.metricName') return 'Categorization';
				return undefined;
			});

			const result = await metricHandlers.categorization.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ Categorization: 0 });
		});

		it('should use custom metric name', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'expected answer';
				if (paramName === 'actualAnswer') return 'expected answer';
				if (paramName === 'options.metricName') return 'Custom Categorization';
				return undefined;
			});

			const result = await metricHandlers.categorization.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ 'Custom Categorization': 1 });
		});

		it('should handle whitespace trimming', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return '  expected answer  ';
				if (paramName === 'actualAnswer') return 'expected answer';
				if (paramName === 'options.metricName') return 'Categorization';
				return undefined;
			});

			const result = await metricHandlers.categorization.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ Categorization: 1 });
		});

		it('should throw error for missing expected answer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return '';
				if (paramName === 'actualAnswer') return 'actual answer';
				return undefined;
			});

			await expect(metricHandlers.categorization.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for missing actual answer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'expected answer';
				if (paramName === 'actualAnswer') return '';
				return undefined;
			});

			await expect(metricHandlers.categorization.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('stringSimilarity', () => {
		it('should return inverted similarity score', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'hello';
				if (paramName === 'actualAnswer') return 'helo';
				if (paramName === 'options.metricName') return 'String similarity';
				return undefined;
			});

			const result = await metricHandlers.stringSimilarity.call(mockExecuteFunctions, 0);

			// Edit distance is 1, longer string length is 5, so similarity = 1 - (1/5) = 0.8
			expect(result).toEqual({ 'String similarity': 0.8 });
		});

		it('should return 1 for identical strings', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'hello';
				if (paramName === 'actualAnswer') return 'hello';
				if (paramName === 'options.metricName') return 'String similarity';
				return undefined;
			});

			const result = await metricHandlers.stringSimilarity.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ 'String similarity': 1 });
		});

		it('should handle whitespace trimming', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return '  hello  ';
				if (paramName === 'actualAnswer') return 'hello';
				if (paramName === 'options.metricName') return 'String similarity';
				return undefined;
			});

			const result = await metricHandlers.stringSimilarity.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ 'String similarity': 1 });
		});

		it('should return low similarity for very different strings', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'hello';
				if (paramName === 'actualAnswer') return 'world';
				if (paramName === 'options.metricName') return 'String similarity';
				return undefined;
			});

			const result = await metricHandlers.stringSimilarity.call(mockExecuteFunctions, 0);

			// Edit distance is 4, longer string length is 5, so similarity = 1 - (4/5) = 0.2
			expect(result['String similarity']).toBeCloseTo(0.2, 2);
		});

		it('should handle different string lengths', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'hello';
				if (paramName === 'actualAnswer') return 'hello world';
				if (paramName === 'options.metricName') return 'String similarity';
				return undefined;
			});

			const result = await metricHandlers.stringSimilarity.call(mockExecuteFunctions, 0);

			// Edit distance is 6, longer string length is 11, so similarity = 1 - (6/11) ≈ 0.45
			expect(result['String similarity']).toBeCloseTo(0.45, 2);
		});

		it('should throw error for missing expected answer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return '';
				if (paramName === 'actualAnswer') return 'actual answer';
				return undefined;
			});

			await expect(metricHandlers.stringSimilarity.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for missing actual answer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'expected answer';
				if (paramName === 'actualAnswer') return '';
				return undefined;
			});

			await expect(metricHandlers.stringSimilarity.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('helpfulness', () => {
		let mockLLM: jest.Mocked<BaseLanguageModel>;

		beforeEach(() => {
			mockLLM = mock<BaseLanguageModel>();
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(mockLLM);
		});

		it('should return helpfulness score from LLM', async () => {
			const mockResponse = {
				extended_reasoning: 'The response is very helpful...',
				reasoning_summary: 'Response directly addresses the query',
				score: 4,
			};

			// Mock the LLM with withStructuredOutput
			const mockLLMWithStructuredOutput = mock<Runnable>();
			mockLLMWithStructuredOutput.invoke.mockResolvedValue(mockResponse);

			mockLLM.withStructuredOutput = jest.fn().mockReturnValue(mockLLMWithStructuredOutput);

			// Mock ChatPromptTemplate.fromMessages to return a chain that can be piped
			const mockChatPromptTemplate = mock<ChatPromptTemplate>();
			mockChatPromptTemplate.pipe.mockReturnValue(mockLLMWithStructuredOutput);

			// Mock the static method
			jest.spyOn(ChatPromptTemplate, 'fromMessages').mockReturnValue(mockChatPromptTemplate);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'userQuery') return 'What is the capital of France?';
				if (paramName === 'actualAnswer') return 'Paris is the capital of France.';
				if (paramName === 'prompt') return 'You are an AI assistant...';
				if (paramName === 'options.inputPrompt')
					return 'Query: {user_query}\\nResponse: {actual_answer}';
				if (paramName === 'options.metricName') return 'Helpfulness';
				return undefined;
			});

			const result = await metricHandlers.helpfulness.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ Helpfulness: 4 });
		});

		it('should throw error for missing user query', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'userQuery') return '';
				if (paramName === 'actualAnswer') return 'Some response';
				return undefined;
			});

			await expect(metricHandlers.helpfulness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for missing actual answer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'userQuery') return 'Some query';
				if (paramName === 'actualAnswer') return '';
				return undefined;
			});

			await expect(metricHandlers.helpfulness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when no LLM is connected', async () => {
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(null);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'userQuery') return 'What is the capital of France?';
				if (paramName === 'actualAnswer') return 'Paris is the capital of France.';
				return undefined;
			});

			await expect(metricHandlers.helpfulness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle LLM errors gracefully', async () => {
			const mockError = new Error('LLM processing failed');
			const mockFinalChain = mock<Runnable>();
			mockFinalChain.invoke.mockRejectedValue(mockError);

			const mockMiddleChain = mock<Runnable>();
			mockMiddleChain.pipe.mockReturnValue(mockFinalChain);

			const mockChatPromptTemplate = mock<ChatPromptTemplate>();
			mockChatPromptTemplate.pipe.mockReturnValue(mockMiddleChain);

			jest.spyOn(ChatPromptTemplate, 'fromMessages').mockReturnValue(mockChatPromptTemplate);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'userQuery') return 'What is the capital of France?';
				if (paramName === 'actualAnswer') return 'Paris is the capital of France.';
				if (paramName === 'prompt') return 'You are an AI assistant...';
				if (paramName === 'options.inputPrompt')
					return 'Query: {user_query}\\nResponse: {actual_answer}';
				if (paramName === 'options.metricName') return 'Helpfulness';
				return undefined;
			});

			await expect(metricHandlers.helpfulness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('correctness', () => {
		let mockLLM: jest.Mocked<BaseLanguageModel>;

		beforeEach(() => {
			mockLLM = mock<BaseLanguageModel>();
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(mockLLM);
		});

		it('should return correctness score from LLM', async () => {
			const mockResponse = {
				extended_reasoning: 'The response is factually correct...',
				reasoning_summary: 'Response matches expected answer',
				score: 5,
			};

			// Mock the LLM with withStructuredOutput
			const mockLLMWithStructuredOutput = mock<Runnable>();
			mockLLMWithStructuredOutput.invoke.mockResolvedValue(mockResponse);

			mockLLM.withStructuredOutput = jest.fn().mockReturnValue(mockLLMWithStructuredOutput);

			const mockChatPromptTemplate = mock<ChatPromptTemplate>();
			mockChatPromptTemplate.pipe.mockReturnValue(mockLLMWithStructuredOutput);

			jest.spyOn(ChatPromptTemplate, 'fromMessages').mockReturnValue(mockChatPromptTemplate);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'Paris';
				if (paramName === 'actualAnswer') return 'Paris is the capital of France.';
				if (paramName === 'prompt') return 'You are an AI assistant...';
				if (paramName === 'options.inputPrompt')
					return 'Expected: {expected_answer}\\nActual: {actual_answer}';
				if (paramName === 'options.metricName') return 'Correctness';
				return undefined;
			});

			const result = await metricHandlers.correctness.call(mockExecuteFunctions, 0);

			expect(result).toEqual({ Correctness: 5 });
		});

		it('should throw error for missing expected answer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return '';
				if (paramName === 'actualAnswer') return 'Some response';
				return undefined;
			});

			await expect(metricHandlers.correctness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for missing actual answer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'Expected answer';
				if (paramName === 'actualAnswer') return '';
				return undefined;
			});

			await expect(metricHandlers.correctness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when no LLM is connected', async () => {
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(null);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'Paris';
				if (paramName === 'actualAnswer') return 'Paris is the capital of France.';
				return undefined;
			});

			await expect(metricHandlers.correctness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle LLM errors gracefully', async () => {
			const mockError = new Error('LLM processing failed');
			const mockFinalChain = mock<Runnable>();
			mockFinalChain.invoke.mockRejectedValue(mockError);

			const mockMiddleChain = mock<Runnable>();
			mockMiddleChain.pipe.mockReturnValue(mockFinalChain);

			const mockChatPromptTemplate = mock<ChatPromptTemplate>();
			mockChatPromptTemplate.pipe.mockReturnValue(mockMiddleChain);

			jest.spyOn(ChatPromptTemplate, 'fromMessages').mockReturnValue(mockChatPromptTemplate);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'expectedAnswer') return 'Paris';
				if (paramName === 'actualAnswer') return 'Paris is the capital of France.';
				if (paramName === 'prompt') return 'You are an AI assistant...';
				if (paramName === 'options.inputPrompt')
					return 'Expected: {expected_answer}\\nActual: {actual_answer}';
				if (paramName === 'options.metricName') return 'Correctness';
				return undefined;
			});

			await expect(metricHandlers.correctness.call(mockExecuteFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});
});
