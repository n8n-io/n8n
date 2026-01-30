import { createGetBestPracticesTool } from '../get-best-practices.tool';
import { WorkflowTechnique } from '@/types/categorization';

describe('get_best_practices tool', () => {
	describe('createGetBestPracticesTool', () => {
		it('should create a tool with correct name and description', () => {
			const tool = createGetBestPracticesTool();

			expect(tool.name).toBe('get_best_practices');
			expect(tool.description).toContain('best practices');
			expect(tool.description).toContain('workflow techniques');
		});

		it('should include available techniques in description', () => {
			const tool = createGetBestPracticesTool();

			expect(tool.description).toContain(WorkflowTechnique.CHATBOT);
			expect(tool.description).toContain(WorkflowTechnique.DATA_EXTRACTION);
		});
	});

	describe('invoke with valid techniques', () => {
		it('should return documentation for chatbot technique', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['chatbot'] });

			expect(result).toContain('CHATBOT');
			expect(result).toContain('Best Practices');
		});

		it('should return documentation for data_extraction technique', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['data_extraction'] });

			expect(result).toContain('DATA_EXTRACTION');
		});

		it('should return documentation for multiple techniques', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['chatbot', 'notification'] });

			expect(result).toContain('CHATBOT');
			expect(result).toContain('NOTIFICATION');
		});

		it('should handle technique names with underscores', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['content_generation'] });

			expect(result).toContain('CONTENT_GENERATION');
		});
	});

	describe('invoke with invalid techniques', () => {
		it('should indicate when no documentation is available', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['nonexistent_technique'] });

			expect(result).toContain('Techniques Without Specific Documentation');
			expect(result).toContain('nonexistent_technique');
		});

		it('should handle mix of valid and invalid techniques', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['chatbot', 'invalid_technique'] });

			expect(result).toContain('CHATBOT');
			expect(result).toContain('Techniques Without Specific Documentation');
			expect(result).toContain('invalid_technique');
		});
	});

	describe('invoke with empty array', () => {
		it('should return available techniques when no techniques requested', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: [] });

			expect(result).toContain('No techniques were requested');
			expect(result).toContain('Available techniques');
		});
	});

	describe('technique matching', () => {
		it('should match techniques case-insensitively', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['CHATBOT'] });

			expect(result).toContain('CHATBOT');
			expect(result).toContain('Best Practices');
		});

		it('should match techniques with hyphens converted to underscores', async () => {
			const tool = createGetBestPracticesTool();

			const result = await tool.invoke({ techniques: ['data-extraction'] });

			// Should still find documentation via normalized matching
			expect(result).not.toContain('No techniques were requested');
		});
	});
});
