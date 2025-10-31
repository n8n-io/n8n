import { WorkflowTechnique } from '@/types/categorization';

import {
	parseToolResult,
	createToolConfig,
	expectToolSuccess,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createGetBestPracticesTool } from '../get-best-practices.tool';

// Mock the best practices documentation
jest.mock('@/tools/best-practices', () => ({
	documentation: {
		[WorkflowTechnique.SCRAPING_AND_RESEARCH]: {
			getDocumentation: jest.fn(() => 'Scraping best practices content'),
		},
		[WorkflowTechnique.CHATBOT]: {
			getDocumentation: jest.fn(() => 'Chatbot best practices content'),
		},
		[WorkflowTechnique.DATA_ANALYSIS]: undefined,
	},
}));

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('GetBestPracticesTool', () => {
	let getBestPracticesTool: ReturnType<typeof createGetBestPracticesTool>['tool'];

	beforeEach(() => {
		jest.clearAllMocks();
		getBestPracticesTool = createGetBestPracticesTool().tool;
	});

	describe('invoke', () => {
		it('should retrieve best practices for single technique', async () => {
			const mockConfig = createToolConfig('get_best_practices', 'test-call-1');

			const result = await getBestPracticesTool.invoke(
				{
					techniques: [WorkflowTechnique.SCRAPING_AND_RESEARCH],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<best_practices>');
			expect(message).toContain('Scraping best practices content');
		});

		it('should retrieve best practices for multiple techniques', async () => {
			const mockConfig = createToolConfig('get_best_practices', 'test-call-2');

			const result = await getBestPracticesTool.invoke(
				{
					techniques: [WorkflowTechnique.SCRAPING_AND_RESEARCH, WorkflowTechnique.CHATBOT],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<best_practices>');
			expect(message).toContain('Scraping best practices content');
			expect(message).toContain('---');
			expect(message).toContain('Chatbot best practices content');
		});

		it('should handle techniques without documentation', async () => {
			const mockConfig = createToolConfig('get_best_practices', 'test-call-3');

			const result = await getBestPracticesTool.invoke(
				{
					techniques: [WorkflowTechnique.DATA_ANALYSIS],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(
				content,
				'No best practices documentation available for the requested techniques',
			);
			expect(message).not.toContain('<best_practices>');
		});

		it('should handle mix of documented and undocumented techniques', async () => {
			const mockConfig = createToolConfig('get_best_practices', 'test-call-4');

			const result = await getBestPracticesTool.invoke(
				{
					techniques: [WorkflowTechnique.CHATBOT, WorkflowTechnique.DATA_ANALYSIS],
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<best_practices>');
			expect(message).toContain('Chatbot best practices content');
			expect(message).not.toContain('DATA_ANALYSIS');
		});

		it('should handle validation error for empty techniques array', async () => {
			const mockConfig = createToolConfig('get_best_practices', 'test-call-5');

			try {
				await getBestPracticesTool.invoke(
					{
						techniques: [],
					},
					mockConfig,
				);

				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});
	});
});
