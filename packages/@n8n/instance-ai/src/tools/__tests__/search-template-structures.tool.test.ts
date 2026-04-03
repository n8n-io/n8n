import { createSearchTemplateStructuresTool } from '../templates/search-template-structures.tool';
import * as templateApi from '../templates/template-api';

jest.mock('../templates/template-api');

const mockedFetchWorkflows = jest.mocked(templateApi.fetchWorkflowsFromTemplates);

describe('search-template-structures tool', () => {
	const tool = createSearchTemplateStructuresTool();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return mermaid diagrams for found templates', async () => {
		mockedFetchWorkflows.mockResolvedValue({
			workflows: [
				{
					templateId: 1,
					name: 'Test Workflow',
					description: 'A test workflow',
					workflow: {
						name: 'Test',
						nodes: [
							{
								name: 'Trigger',
								type: 'n8n-nodes-base.scheduleTrigger',
								typeVersion: 1,
								position: [0, 0] as [number, number],
								parameters: {},
							},
							{
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 1,
								position: [200, 0] as [number, number],
								parameters: { url: 'https://example.com' },
							},
						],
						connections: {
							Trigger: { main: [[{ node: 'HTTP Request' }]] },
						},
					},
				},
			],
			totalFound: 42,
			templateIds: [1],
		});

		const result = await tool.execute!({ search: 'http request', rows: 5 }, {} as never);

		expect(result).toBeDefined();
		expect(result).toMatchObject({
			totalResults: 42,
		});

		// Use toMatchObject to avoid union type issues
		const output = result as {
			examples: Array<{ name: string; description?: string; mermaid: string }>;
			totalResults: number;
		};
		expect(output.examples).toHaveLength(1);
		expect(output.examples[0].name).toBe('Test Workflow');
		expect(output.examples[0].description).toBe('A test workflow');
		expect(output.examples[0].mermaid).toContain('```mermaid');
		expect(output.examples[0].mermaid).toContain('Trigger');
		expect(output.examples[0].mermaid).toContain('HTTP Request');
		// Should NOT include parameters since we pass includeNodeParameters: false
		expect(output.examples[0].mermaid).not.toContain('https://example.com');
		expect(output.totalResults).toBe(42);
	});

	it('should handle empty results', async () => {
		mockedFetchWorkflows.mockResolvedValue({
			workflows: [],
			totalFound: 0,
			templateIds: [],
		});

		const result = await tool.execute!({ search: 'nonexistent' }, {} as never);

		expect(result).toMatchObject({
			examples: [],
			totalResults: 0,
		});
	});

	it('should pass search parameters to fetchWorkflowsFromTemplates', async () => {
		mockedFetchWorkflows.mockResolvedValue({
			workflows: [],
			totalFound: 0,
			templateIds: [],
		});

		await tool.execute!({ search: 'telegram', category: 'AI', rows: 3 }, {} as never);

		expect(mockedFetchWorkflows).toHaveBeenCalledWith({
			search: 'telegram',
			category: 'AI',
			rows: 3,
		});
	});
});
