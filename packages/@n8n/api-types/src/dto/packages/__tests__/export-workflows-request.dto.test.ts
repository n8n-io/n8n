import { ExportWorkflowsRequestDto } from '../export-workflows-request.dto';

describe('ExportWorkflowsRequestDto', () => {
	it('accepts a request with workflow ids only', () => {
		expect(ExportWorkflowsRequestDto.safeParse({ workflowIds: ['wf-1', 'wf-2'] }).success).toBe(
			true,
		);
	});

	it('accepts a request with folder ids only', () => {
		expect(ExportWorkflowsRequestDto.safeParse({ folderIds: ['fld-1'] }).success).toBe(true);
	});

	it('accepts a request with both workflow and folder ids', () => {
		expect(
			ExportWorkflowsRequestDto.safeParse({ workflowIds: ['wf-1'], folderIds: ['fld-1'] }).success,
		).toBe(true);
	});

	it('accepts up to 300 ids per collection', () => {
		const workflowIds = Array.from({ length: 300 }, (_, i) => `wf-${i}`);
		const folderIds = Array.from({ length: 300 }, (_, i) => `fld-${i}`);
		expect(ExportWorkflowsRequestDto.safeParse({ workflowIds, folderIds }).success).toBe(true);
	});

	it.each([
		{ name: 'nothing to export', request: {} },
		{ name: 'both collections empty', request: { workflowIds: [], folderIds: [] } },
		{ name: 'empty-string workflow id', request: { workflowIds: [''] } },
		{ name: 'whitespace-only workflow id', request: { workflowIds: ['   '] } },
		{ name: 'empty-string folder id', request: { folderIds: [''] } },
		{ name: 'non-string id', request: { workflowIds: [123] } },
		{
			name: 'more than 300 workflow ids',
			request: { workflowIds: Array.from({ length: 301 }, (_, i) => `wf-${i}`) },
		},
		{
			name: 'more than 300 folder ids',
			request: { folderIds: Array.from({ length: 301 }, (_, i) => `fld-${i}`) },
		},
	])('rejects $name', ({ request }) => {
		expect(ExportWorkflowsRequestDto.safeParse(request).success).toBe(false);
	});
});
