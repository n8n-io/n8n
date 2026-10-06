import { ExportPackageRequestDto } from '../export-package-request.dto';

describe('ExportPackageRequestDto', () => {
	describe.each(['workflowIds', 'agentIds'] as const)('%s', (field) => {
		it('accepts and trims up to 300 IDs', () => {
			const ids = Array.from({ length: 300 }, (_, index) => `id-${index}`);
			const parsed = ExportPackageRequestDto.parse({ [field]: ids.map((id) => ` ${id} `) });
			expect(parsed[field]).toEqual(ids);
		});

		it.each([
			{ name: 'empty array', ids: [] },
			{ name: 'empty ID', ids: [''] },
			{ name: 'whitespace ID', ids: ['   '] },
			{ name: 'non-string ID', ids: [123] },
			{ name: 'more than 300 IDs', ids: Array.from({ length: 301 }, (_, i) => `id-${i}`) },
		])('rejects $name', ({ ids }) => {
			expect(ExportPackageRequestDto.safeParse({ [field]: ids }).success).toBe(false);
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

	describe('includeTags', () => {
		it('defaults to true when omitted', () => {
			const result = ExportPackageRequestDto.safeParse({ workflowIds: ['wf-1'] });
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.includeTags).toBe(true);
		});

		it.each([true, false])('accepts explicit %s', (includeTags) => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				includeTags,
			});
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.includeTags).toBe(includeTags);
		});

		it.each([
			{ name: 'string value', includeTags: 'false' },
			{ name: 'numeric value', includeTags: 0 },
			{ name: 'null value', includeTags: null },
		])('rejects $name', ({ includeTags }) => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				includeTags,
			});
			expect(result.success).toBe(false);
		});
	});

	describe.each(['missingWorkflowDependencyPolicy', 'missingAgentDependencyPolicy'] as const)(
		'%s',
		(field) => {
			it.each(['fail', 'reference-only', 'include-in-package'])('accepts %s', (value) => {
				expect(ExportPackageRequestDto.parse({ [field]: value })[field]).toBe(value);
			});

			it('defaults to fail', () => {
				expect(ExportPackageRequestDto.parse({})[field]).toBe('fail');
			});

			it('rejects unknown values', () => {
				expect(ExportPackageRequestDto.safeParse({ [field]: 'skip' }).success).toBe(false);
			});
		},
	);

	describe.each(['workflowVersionPolicy', 'agentVersionPolicy'] as const)('%s', (field) => {
		it.each(['published-strict', 'prefer-published', 'ignore-unpublished', 'latest'])(
			'accepts %s',
			(value) => {
				expect(ExportPackageRequestDto.parse({ [field]: value })[field]).toBe(value);
			},
		);

		it('defaults to latest', () => {
			expect(ExportPackageRequestDto.parse({})[field]).toBe('latest');
		});

		it('rejects unknown values', () => {
			expect(ExportPackageRequestDto.safeParse({ [field]: 'published' }).success).toBe(false);
		});
	});

	describe('credentialExportPolicy', () => {
		it.each(['expression-values-only', 'no-values'])('accepts %s', (credentialExportPolicy) => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				credentialExportPolicy,
			});

			expect(result.success).toBe(true);
		});

		it('defaults to expression-values-only', () => {
			const result = ExportPackageRequestDto.safeParse({ workflowIds: ['wf-1'] });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialExportPolicy).toBe('expression-values-only');
			}
		});

		it('rejects unknown values', () => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				credentialExportPolicy: 'all-values',
			});

			expect(result.success).toBe(false);
		});
	});

	describe('includeArchivedWorkflows', () => {
		it.each([true, false])('accepts %s', (includeArchivedWorkflows) => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				includeArchivedWorkflows,
			});

			expect(result.success).toBe(true);
		});

		it('defaults to false', () => {
			const result = ExportPackageRequestDto.safeParse({ workflowIds: ['wf-1'] });

			expect(result.success).toBe(true);
			if (result.success) expect(result.data.includeArchivedWorkflows).toBe(false);
		});

		it('rejects non-boolean values', () => {
			const result = ExportPackageRequestDto.safeParse({
				workflowIds: ['wf-1'],
				includeArchivedWorkflows: 'yes',
			});

			expect(result.success).toBe(false);
		});
	});
});
