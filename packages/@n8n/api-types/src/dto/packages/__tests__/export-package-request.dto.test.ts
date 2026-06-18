import { ExportPackageRequestDto } from '../export-package-request.dto';

describe('ExportPackageRequestDto', () => {
	describe('workflowIds', () => {
		it('accepts a non-empty array of workflow ids', () => {
			const result = ExportPackageRequestDto.safeParse({ workflowIds: ['wf-1', 'wf-2'] });
			expect(result.success).toBe(true);
		});

		it('accepts up to 300 workflow ids', () => {
			const workflowIds = Array.from({ length: 300 }, (_, i) => `wf-${i}`);
			expect(ExportPackageRequestDto.safeParse({ workflowIds }).success).toBe(true);
		});

		it.each([
			{ name: 'empty workflowIds array', request: { workflowIds: [] } },
			{ name: 'both empty arrays', request: { workflowIds: [], projectIds: [] } },
			{ name: 'empty-string workflow id', request: { workflowIds: [''] } },
			{ name: 'whitespace-only workflow id', request: { workflowIds: ['   '] } },
			{ name: 'non-string workflow id', request: { workflowIds: [123] } },
			{
				name: 'more than 300 workflow ids',
				request: { workflowIds: Array.from({ length: 301 }, (_, i) => `wf-${i}`) },
			},
		])('rejects $name', ({ request }) => {
			expect(ExportPackageRequestDto.safeParse(request).success).toBe(false);
		});
	});

	describe('projectIds', () => {
		it('accepts a non-empty array of project ids', () => {
			const result = ExportPackageRequestDto.safeParse({ projectIds: ['project-1'] });
			expect(result.success).toBe(true);
		});

		it('accepts up to 300 project ids', () => {
			const projectIds = Array.from({ length: 300 }, (_, i) => `project-${i}`);
			expect(ExportPackageRequestDto.safeParse({ projectIds }).success).toBe(true);
		});

		it.each([
			{ name: 'empty projectIds array', request: { projectIds: [] } },
			{ name: 'both empty arrays', request: { workflowIds: [], projectIds: [] } },
			{ name: 'empty-string project id', request: { projectIds: [''] } },
			{ name: 'whitespace-only project id', request: { projectIds: ['   '] } },
			{ name: 'non-string project id', request: { projectIds: [123] } },
			{
				name: 'more than 300 project ids',
				request: { projectIds: Array.from({ length: 301 }, (_, i) => `project-${i}`) },
			},
		])('rejects $name', ({ request }) => {
			expect(ExportPackageRequestDto.safeParse(request).success).toBe(false);
		});
	});
});
