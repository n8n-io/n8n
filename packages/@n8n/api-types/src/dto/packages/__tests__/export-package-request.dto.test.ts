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

	describe('folderIds', () => {
		it('accepts a non-empty array of folder ids', () => {
			const result = ExportPackageRequestDto.safeParse({ folderIds: ['fld-1'] });
			expect(result.success).toBe(true);
		});

		it('accepts up to 300 folder ids', () => {
			const folderIds = Array.from({ length: 300 }, (_, i) => `fld-${i}`);
			expect(ExportPackageRequestDto.safeParse({ folderIds }).success).toBe(true);
		});

		it('accepts workflow and folder ids together', () => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				folderIds: ['fld-1'],
			});
			expect(result.success).toBe(true);
		});

		it.each([
			{ name: 'empty folderIds array', request: { folderIds: [] } },
			{ name: 'empty-string folder id', request: { folderIds: [''] } },
			{ name: 'whitespace-only folder id', request: { folderIds: ['   '] } },
			{ name: 'non-string folder id', request: { folderIds: [123] } },
			{
				name: 'more than 300 folder ids',
				request: { folderIds: Array.from({ length: 301 }, (_, i) => `fld-${i}`) },
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

	describe('includeVariableValues', () => {
		it('defaults to true when omitted', () => {
			const result = ExportPackageRequestDto.safeParse({ workflowIds: ['wf-1'] });
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.includeVariableValues).toBe(true);
		});

		it.each([true, false])('accepts explicit %s', (includeVariableValues) => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				includeVariableValues,
			});
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.includeVariableValues).toBe(includeVariableValues);
		});

		it.each([
			{ name: 'string value', includeVariableValues: 'false' },
			{ name: 'numeric value', includeVariableValues: 0 },
			{ name: 'null value', includeVariableValues: null },
		])('rejects $name', ({ includeVariableValues }) => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				includeVariableValues,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('missingWorkflowDependencyPolicy', () => {
		it.each(['fail', 'reference-only', 'include-in-package'])(
			'accepts %s',
			(missingWorkflowDependencyPolicy) => {
				const result = ExportPackageRequestDto.safeParse({
					workflowIds: ['wf-1'],
					missingWorkflowDependencyPolicy,
				});

				expect(result.success).toBe(true);
			},
		);

		it('defaults to fail', () => {
			const result = ExportPackageRequestDto.safeParse({ workflowIds: ['wf-1'] });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.missingWorkflowDependencyPolicy).toBe('fail');
			}
		});

		it('rejects unknown values', () => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				missingWorkflowDependencyPolicy: 'skip',
			});

			expect(result.success).toBe(false);
		});
	});
});
