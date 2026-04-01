import { createSearchWorkflowTemplatesTool } from '../templates/search-workflow-templates.tool';
import * as templateApi from '../templates/template-api';

jest.mock('../templates/template-api');

const mockedFetchTemplateList = jest.mocked(templateApi.fetchTemplateList);

interface SearchWorkflowTemplatesOutput {
	templates: Array<{
		templateId: number;
		name: string;
		description?: string;
	}>;
	totalResults: number;
}

describe('search-workflow-templates tool', () => {
	const tool = createSearchWorkflowTemplatesTool();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns concise template suggestions for inspiration mode', async () => {
		mockedFetchTemplateList.mockResolvedValue({
			totalWorkflows: 12,
			workflows: [
				{
					id: 101,
					name: 'Slack Lead Intake',
					description: 'Capture leads from Slack and route them to the right team',
				},
				{
					id: 202,
					name: 'Airtable CRM Sync',
					description: 'Sync CRM updates into Airtable on a schedule',
				},
			],
		});

		const result = (await tool.execute!(
			{ search: 'lead intake', category: 'Sales', rows: 2 },
			{} as never,
		)) as SearchWorkflowTemplatesOutput;

		expect(mockedFetchTemplateList).toHaveBeenCalledWith({
			search: 'lead intake',
			category: 'Sales',
			rows: 2,
		});
		expect(result.templates).toEqual([
			{
				templateId: 101,
				name: 'Slack Lead Intake',
				description: 'Capture leads from Slack and route them to the right team',
			},
			{
				templateId: 202,
				name: 'Airtable CRM Sync',
				description: 'Sync CRM updates into Airtable on a schedule',
			},
		]);
		expect(result.totalResults).toBe(12);
		expect(result).not.toHaveProperty('formatted');
	});

	it('handles empty results', async () => {
		mockedFetchTemplateList.mockResolvedValue({
			totalWorkflows: 0,
			workflows: [],
		});

		const result = (await tool.execute!(
			{ search: 'nonexistent workflow idea' },
			{} as never,
		)) as SearchWorkflowTemplatesOutput;

		expect(result.templates).toEqual([]);
		expect(result.totalResults).toBe(0);
		expect(result).not.toHaveProperty('formatted');
	});
});
