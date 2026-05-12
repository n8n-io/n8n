import { createTemplatesTool } from '../templates.tool';

describe('templates tool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('best-practices action', () => {
		it('should return list of available techniques when technique is "list"', async () => {
			const tool = createTemplatesTool();
			const result = await tool.execute!(
				{ action: 'best-practices', technique: 'list' },
				{} as never,
			);

			const typed = result as {
				technique: string;
				availableTechniques: Array<{
					technique: string;
					description: string;
					hasDocumentation: boolean;
				}>;
				message: string;
			};

			expect(typed.technique).toBe('list');
			expect(typed.availableTechniques.length).toBeGreaterThan(0);
			expect(typed.message).toContain('techniques');

			// Verify each entry has required fields
			for (const entry of typed.availableTechniques) {
				expect(entry).toHaveProperty('technique');
				expect(entry).toHaveProperty('description');
				expect(entry).toHaveProperty('hasDocumentation');
			}
		});

		it('should return documentation for a known technique with docs', async () => {
			const tool = createTemplatesTool();
			const result = await tool.execute!(
				{ action: 'best-practices', technique: 'scheduling' },
				{} as never,
			);

			const typed = result as { technique: string; documentation: string; message: string };

			expect(typed.technique).toBe('scheduling');
			expect(typed.documentation).toBeDefined();
			expect(typeof typed.documentation).toBe('string');
			expect(typed.documentation.length).toBeGreaterThan(0);
			expect(typed.message).toContain('scheduling');
		});

		it('should return a message for a known technique without docs', async () => {
			const tool = createTemplatesTool();
			const result = await tool.execute!(
				{ action: 'best-practices', technique: 'data_analysis' },
				{} as never,
			);

			const typed = result as { technique: string; message: string };

			expect(typed.technique).toBe('data_analysis');
			expect(typed.message).toContain('does not have detailed documentation');
		});

		it('should return unknown technique message for invalid technique', async () => {
			const tool = createTemplatesTool();
			const result = await tool.execute!(
				{ action: 'best-practices', technique: 'nonexistent_technique' },
				{} as never,
			);

			const typed = result as { technique: string; message: string };

			expect(typed.technique).toBe('nonexistent_technique');
			expect(typed.message).toContain('Unknown technique');
		});
	});
});
