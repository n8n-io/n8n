import { ExportWorkflowsRequestDto } from '../export-workflows-request.dto';

describe('ExportWorkflowsRequestDto', () => {
	it('accepts a non-empty array of workflow ids', () => {
		const result = ExportWorkflowsRequestDto.safeParse({ workflowIds: ['wf-1', 'wf-2'] });
		expect(result.success).toBe(true);
	});

	it('accepts up to 300 workflow ids', () => {
		const workflowIds = Array.from({ length: 300 }, (_, i) => `wf-${i}`);
		expect(ExportWorkflowsRequestDto.safeParse({ workflowIds }).success).toBe(true);
	});

	it.each([
		{ name: 'missing workflowIds', request: {} },
		{ name: 'empty workflowIds array', request: { workflowIds: [] } },
		{ name: 'empty-string id', request: { workflowIds: [''] } },
		{ name: 'whitespace-only id', request: { workflowIds: ['   '] } },
		{ name: 'non-string id', request: { workflowIds: [123] } },
		{
			name: 'more than 300 workflow ids',
			request: { workflowIds: Array.from({ length: 301 }, (_, i) => `wf-${i}`) },
		},
	])('rejects $name', ({ request }) => {
		expect(ExportWorkflowsRequestDto.safeParse(request).success).toBe(false);
	});
});
