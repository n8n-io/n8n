import { createSearchTemplateParametersTool } from '../templates/search-template-parameters.tool';
import * as templateApi from '../templates/template-api';
import type { NodeConfigurationsMap } from '../templates/types';

jest.mock('../templates/template-api');

const mockedFetchWorkflows = jest.mocked(templateApi.fetchWorkflowsFromTemplates);

interface ParametersToolOutput {
	configurations: NodeConfigurationsMap;
	nodeTypes: string[];
	totalTemplatesSearched: number;
	formatted: string;
}

describe('search-template-parameters tool', () => {
	const tool = createSearchTemplateParametersTool();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return node configurations from templates', async () => {
		mockedFetchWorkflows.mockResolvedValue({
			workflows: [
				{
					templateId: 1,
					name: 'Test',
					workflow: {
						nodes: [
							{
								name: 'Slack',
								type: 'n8n-nodes-base.slack',
								typeVersion: 2,
								position: [0, 0] as [number, number],
								parameters: { channel: '#general', text: 'Hello' },
							},
							{
								name: 'HTTP',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 1,
								position: [200, 0] as [number, number],
								parameters: { url: 'https://api.example.com' },
							},
						],
						connections: {},
					},
				},
			],
			totalFound: 10,
			templateIds: [1],
		});

		const result = (await tool.execute!({ search: 'slack' }, {} as never)) as ParametersToolOutput;

		expect(result.nodeTypes).toContain('n8n-nodes-base.slack');
		expect(result.nodeTypes).toContain('n8n-nodes-base.httpRequest');
		expect(result.configurations['n8n-nodes-base.slack']).toHaveLength(1);
		expect(result.configurations['n8n-nodes-base.slack'][0].parameters).toEqual({
			channel: '#general',
			text: 'Hello',
		});
		expect(result.totalTemplatesSearched).toBe(10);
		expect(result.formatted).toContain('Node Configuration Examples');
	});

	it('should filter by nodeType when specified', async () => {
		mockedFetchWorkflows.mockResolvedValue({
			workflows: [
				{
					templateId: 1,
					name: 'Test',
					workflow: {
						nodes: [
							{
								name: 'Slack',
								type: 'n8n-nodes-base.slack',
								typeVersion: 2,
								position: [0, 0] as [number, number],
								parameters: { channel: '#general' },
							},
							{
								name: 'HTTP',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 1,
								position: [200, 0] as [number, number],
								parameters: { url: 'https://api.example.com' },
							},
						],
						connections: {},
					},
				},
			],
			totalFound: 10,
			templateIds: [1],
		});

		const result = (await tool.execute!(
			{ search: 'slack', nodeType: 'n8n-nodes-base.slack' },
			{} as never,
		)) as unknown as ParametersToolOutput;

		expect(result.nodeTypes).toEqual(['n8n-nodes-base.slack']);
		expect(result.configurations['n8n-nodes-base.httpRequest']).toBeUndefined();
	});

	it('should handle empty results when nodeType has no matches', async () => {
		mockedFetchWorkflows.mockResolvedValue({
			workflows: [
				{
					templateId: 1,
					name: 'Test',
					workflow: {
						nodes: [
							{
								name: 'Slack',
								type: 'n8n-nodes-base.slack',
								typeVersion: 2,
								position: [0, 0] as [number, number],
								parameters: { channel: '#general' },
							},
						],
						connections: {},
					},
				},
			],
			totalFound: 1,
			templateIds: [1],
		});

		const result = (await tool.execute!(
			{ search: 'slack', nodeType: 'n8n-nodes-base.telegram' },
			{} as never,
		)) as unknown as ParametersToolOutput;

		expect(result.nodeTypes).toHaveLength(0);
		expect(Object.keys(result.configurations)).toHaveLength(0);
	});
});
