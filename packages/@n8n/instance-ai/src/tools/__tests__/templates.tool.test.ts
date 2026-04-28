import { fetchWorkflowsFromTemplates } from '../templates/template-api';
import { createTemplatesTool } from '../templates.tool';

// Mock external dependencies — templates tool takes no context
jest.mock('../templates/template-api', () => ({
	fetchWorkflowsFromTemplates: jest.fn(),
}));

jest.mock('../utils/mermaid.utils', () => ({
	mermaidStringify: jest.fn().mockReturnValue('graph TD\n  A-->B'),
}));

jest.mock('../utils/node-configuration.utils', () => ({
	collectNodeConfigurationsFromWorkflows: jest.fn().mockReturnValue({
		'n8n-nodes-base.telegram': [{ parameters: { chatId: '123' } }],
	}),
	formatNodeConfigurationExamples: jest
		.fn()
		.mockReturnValue('## n8n-nodes-base.telegram\nchatId: 123'),
}));

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

	describe('search-structures action', () => {
		it('should call fetchWorkflowsFromTemplates and return mermaid diagrams', async () => {
			(fetchWorkflowsFromTemplates as jest.Mock).mockResolvedValue({
				workflows: [{ name: 'WF1', description: 'Desc1', nodes: [], connections: {} }],
				totalFound: 10,
			});

			const tool = createTemplatesTool();
			const result = await tool.execute!(
				{ action: 'search-structures', search: 'slack notification' },
				{} as never,
			);

			expect(fetchWorkflowsFromTemplates).toHaveBeenCalledWith({
				search: 'slack notification',
				category: undefined,
				rows: undefined,
			});

			const typed = result as {
				examples: Array<{ name: string; mermaid: string }>;
				totalResults: number;
			};
			expect(typed.examples).toHaveLength(1);
			expect(typed.examples[0].name).toBe('WF1');
			expect(typed.totalResults).toBe(10);
		});
	});

	describe('search-parameters action', () => {
		it('should call fetchWorkflowsFromTemplates and return configurations', async () => {
			(fetchWorkflowsFromTemplates as jest.Mock).mockResolvedValue({
				workflows: [{ name: 'WF1', description: 'Desc1', nodes: [], connections: {} }],
				totalFound: 5,
			});

			const tool = createTemplatesTool();
			const result = await tool.execute!(
				{
					action: 'search-parameters',
					search: 'telegram bot',
					nodeType: 'n8n-nodes-base.telegram',
				},
				{} as never,
			);

			expect(fetchWorkflowsFromTemplates).toHaveBeenCalledWith({
				search: 'telegram bot',
				category: undefined,
				rows: undefined,
			});

			const typed = result as {
				configurations: Record<string, unknown>;
				nodeTypes: string[];
				totalTemplatesSearched: number;
				formatted: string;
			};
			expect(typed.nodeTypes).toContain('n8n-nodes-base.telegram');
			expect(typed.totalTemplatesSearched).toBe(5);
		});
	});
});
