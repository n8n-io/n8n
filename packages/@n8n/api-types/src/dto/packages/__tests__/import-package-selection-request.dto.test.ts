import {
	ImportPackageSelectionRequestDto,
	IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS,
} from '../import-package-request.dto';

describe('ImportPackageSelectionRequestDto', () => {
	const base = {
		selectedProjectId: 'P1',
		selectedWorkflowIds: '["WFA","WFB"]',
	};

	it('parses selectedWorkflowIds from a JSON array string and defaults the overridable policies', () => {
		const result = ImportPackageSelectionRequestDto.safeParse(base);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA', 'WFB'],
				deletedWorkflowIds: undefined,
				workflowConflictPolicy: 'new-version',
				workflowIdPolicy: 'source',
			});
		}
	});

	it('parses deletedWorkflowIds when present', () => {
		const result = ImportPackageSelectionRequestDto.safeParse({
			...base,
			deletedWorkflowIds: '["WFC"]',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA', 'WFB'],
				deletedWorkflowIds: ['WFC'],
				workflowConflictPolicy: 'new-version',
				workflowIdPolicy: 'source',
			});
		}
	});

	it('accepts an empty selectedWorkflowIds array', () => {
		const result = ImportPackageSelectionRequestDto.safeParse({
			selectedProjectId: 'P1',
			selectedWorkflowIds: '[]',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.selectedWorkflowIds).toEqual([]);
		}
	});

	it('leaves deletedWorkflowIds undefined when blank', () => {
		const result = ImportPackageSelectionRequestDto.safeParse({
			...base,
			deletedWorkflowIds: '   ',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.deletedWorkflowIds).toBeUndefined();
		}
	});

	it.each([
		{ name: 'missing (blank)', selectedWorkflowIds: '' },
		{ name: 'invalid JSON', selectedWorkflowIds: 'not json' },
		{ name: 'a JSON object rather than array', selectedWorkflowIds: '{"a":"b"}' },
		{ name: 'a non-string element', selectedWorkflowIds: '["WFA",1]' },
		{ name: 'an empty-string element', selectedWorkflowIds: '["WFA",""]' },
		{ name: 'whitespace-only (blank)', selectedWorkflowIds: '   ' },
		{ name: 'a whitespace-only element', selectedWorkflowIds: '["WFA","   "]' },
	])('rejects selectedWorkflowIds that is $name', ({ selectedWorkflowIds }) => {
		expect(
			ImportPackageSelectionRequestDto.safeParse({ selectedProjectId: 'P1', selectedWorkflowIds })
				.success,
		).toBe(false);
	});

	it.each([
		{ name: 'invalid JSON', deletedWorkflowIds: 'not json' },
		{ name: 'a non-string element', deletedWorkflowIds: '[1]' },
		{ name: 'a whitespace-only element', deletedWorkflowIds: '["   "]' },
	])('rejects deletedWorkflowIds that is $name', ({ deletedWorkflowIds }) => {
		expect(
			ImportPackageSelectionRequestDto.safeParse({ ...base, deletedWorkflowIds }).success,
		).toBe(false);
	});

	it.each([
		{ name: 'absent', request: { selectedWorkflowIds: '["WFA"]' } },
		{ name: 'empty', request: { selectedProjectId: '', selectedWorkflowIds: '["WFA"]' } },
		{
			name: 'whitespace-only',
			request: { selectedProjectId: '   ', selectedWorkflowIds: '["WFA"]' },
		},
	])('rejects a $name selectedProjectId', ({ request }) => {
		expect(ImportPackageSelectionRequestDto.safeParse(request).success).toBe(false);
	});

	describe('overridable policy enums', () => {
		it('defaults blank policy fields', () => {
			const result = ImportPackageSelectionRequestDto.safeParse({
				...base,
				workflowConflictPolicy: '',
				workflowIdPolicy: '   ',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.workflowConflictPolicy).toBe('new-version');
				expect(result.data.workflowIdPolicy).toBe('source');
			}
		});

		it('accepts explicit values', () => {
			const result = ImportPackageSelectionRequestDto.safeParse({
				...base,
				workflowConflictPolicy: 'skip',
				workflowIdPolicy: 'new',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.workflowConflictPolicy).toBe('skip');
				expect(result.data.workflowIdPolicy).toBe('new');
			}
		});

		it.each([
			{ field: 'workflowConflictPolicy', value: 'overwrite' },
			{ field: 'workflowIdPolicy', value: 'reuse' },
		])('rejects an unsupported $field value', ({ field, value }) => {
			expect(ImportPackageSelectionRequestDto.safeParse({ ...base, [field]: value }).success).toBe(
				false,
			);
		});
	});

	it('does not accept a target projectId/folderId, the locked cherry-pick policies, nor bindings', () => {
		const result = ImportPackageSelectionRequestDto.safeParse({
			...base,
			projectId: 'proj-1',
			folderId: 'fld-1',
			folderConflictPolicy: 'overwrite',
			tagConflictPolicy: 'fail',
			projectConflictPolicy: 'overwrite',
			overwriteDeletionPolicy: 'hard-delete',
			bindings: '{"credentials":{"a":"b"}}',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			// The DTO strips unknown fields instead of rejecting the request.
			expect(result.data).not.toHaveProperty('projectId');
			expect(result.data).not.toHaveProperty('folderId');
			expect(result.data).not.toHaveProperty('folderConflictPolicy');
			expect(result.data).not.toHaveProperty('tagConflictPolicy');
			expect(result.data).not.toHaveProperty('projectConflictPolicy');
			expect(result.data).not.toHaveProperty('overwriteDeletionPolicy');
			expect(result.data).not.toHaveProperty('bindings');
		}
	});

	it('lists the selection fields as multipart form fields', () => {
		expect(IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS).toEqual([
			'selectedProjectId',
			'selectedWorkflowIds',
			'deletedWorkflowIds',
			'workflowConflictPolicy',
			'workflowIdPolicy',
		]);
	});
});
