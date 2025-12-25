import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { promptCategorizationChain } from '@/chains/prompt-categorization';
import { WorkflowTechnique, type PromptCategorization } from '@/types/categorization';

import {
	parseToolResult,
	createToolConfig,
	expectToolSuccess,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createCategorizePromptTool } from '../categorize-prompt.tool';

// Mock the categorization chain
jest.mock('@/chains/prompt-categorization');

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('CategorizePromptTool', () => {
	let mockLlm: BaseChatModel;
	let categorizePromptTool: ReturnType<typeof createCategorizePromptTool>['tool'];
	const mockCategorizationChain = promptCategorizationChain as jest.MockedFunction<
		typeof promptCategorizationChain
	>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create a mock LLM
		mockLlm = {} as BaseChatModel;

		// Create the tool
		categorizePromptTool = createCategorizePromptTool(mockLlm).tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should categorize a scraping prompt', async () => {
			const mockCategorization: PromptCategorization = {
				techniques: [
					WorkflowTechnique.SCRAPING_AND_RESEARCH,
					WorkflowTechnique.DATA_TRANSFORMATION,
				],
				confidence: 0.9,
			};

			mockCategorizationChain.mockResolvedValue(mockCategorization);

			const mockConfig = createToolConfig('categorize_prompt', 'test-call-1');

			const result = await categorizePromptTool.invoke(
				{
					prompt: 'I want to scrape product information from a website and store it in a database',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Prompt categorized');
			expect(message).toContain('Techniques: scraping_and_research, data_transformation');
			expect(message).toContain('Confidence: 90%');

			// Verify state update is present in the update object
			expect(content.update).toHaveProperty('categorization');
			expect(
				(content.update as unknown as { categorization: PromptCategorization }).categorization,
			).toEqual(mockCategorization);

			// Verify the chain was called with correct parameters
			expect(mockCategorizationChain).toHaveBeenCalledWith(
				mockLlm,
				'I want to scrape product information from a website and store it in a database',
			);
		});

		it('should categorize a chatbot prompt', async () => {
			const mockCategorization: PromptCategorization = {
				techniques: [WorkflowTechnique.CHATBOT, WorkflowTechnique.NOTIFICATION],
				confidence: 0.85,
			};

			mockCategorizationChain.mockResolvedValue(mockCategorization);

			const mockConfig = createToolConfig('categorize_prompt', 'test-call-2');

			const result = await categorizePromptTool.invoke(
				{
					prompt: 'Build a chatbot that answers customer questions and notifies support team',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Prompt categorized');
			expect(message).toContain('Techniques: chatbot, notification');
			expect(message).toContain('Confidence: 85%');
		});

		it('should handle categorization without use case', async () => {
			const mockCategorization: PromptCategorization = {
				techniques: [WorkflowTechnique.DATA_TRANSFORMATION],
				confidence: 0.7,
			};

			mockCategorizationChain.mockResolvedValue(mockCategorization);

			const mockConfig = createToolConfig('categorize_prompt', 'test-call-3');

			const result = await categorizePromptTool.invoke(
				{
					prompt: 'Transform data format',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Prompt categorized');
			expect(message).toContain('Techniques: data_transformation');
		});

		it('should handle categorization with multiple techniques', async () => {
			const mockCategorization: PromptCategorization = {
				techniques: [
					WorkflowTechnique.SCHEDULING,
					WorkflowTechnique.CONTENT_GENERATION,
					WorkflowTechnique.NOTIFICATION,
					WorkflowTechnique.DATA_ANALYSIS,
				],
				confidence: 0.95,
			};

			mockCategorizationChain.mockResolvedValue(mockCategorization);

			const mockConfig = createToolConfig('categorize_prompt', 'test-call-4');

			const result = await categorizePromptTool.invoke(
				{
					prompt:
						'Schedule daily content generation, analyze engagement metrics, and send notifications',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, 'Prompt categorized');
			expect(message).toContain('scheduling');
			expect(message).toContain('content_generation');
			expect(message).toContain('notification');
			expect(message).toContain('data_analysis');
		});

		it('should handle validation error for empty prompt', async () => {
			const mockConfig = createToolConfig('categorize_prompt', 'test-call-5');

			try {
				await categorizePromptTool.invoke(
					{
						prompt: '',
					},
					mockConfig,
				);

				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle validation error for missing prompt', async () => {
			const mockConfig = createToolConfig('categorize_prompt', 'test-call-6');

			try {
				await categorizePromptTool.invoke({}, mockConfig);

				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle categorization chain errors', async () => {
			mockCategorizationChain.mockRejectedValue(new Error('LLM service unavailable'));

			const mockConfig = createToolConfig('categorize_prompt', 'test-call-7');

			const result = await categorizePromptTool.invoke(
				{
					prompt: 'Test prompt',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('Error');
			expect(message).toContain('LLM service unavailable');
		});
	});
});
