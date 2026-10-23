import {
	ImportPackageSelectionRequestDto,
	IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS,
} from '../import-package-request.dto';
import { withPackageFile } from './with-package-file';

describe('ImportPackageSelectionRequestDto', () => {
	const base = withPackageFile({
		selectedProjectId: 'P1',
		selectedWorkflowIds: '["WFA","WFB"]',
	});

	it('parses selectedWorkflowIds from a JSON array string and defaults the overridable policies', () => {
		const result = ImportPackageSelectionRequestDto.safeParse(base);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(
				withPackageFile({
					selectedProjectId: 'P1',
					selectedWorkflowIds: ['WFA', 'WFB'],
					deletedWorkflowIds: undefined,
					workflowConflictPolicy: 'new-version',
					workflowIdPolicy: 'source',
					overwriteDeletionPolicy: 'archive',
				}),
			);
		}
	});

	it('parses deletedWorkflowIds when present', () => {
		const result = ImportPackageSelectionRequestDto.safeParse({
			...base,
			deletedWorkflowIds: '["WFC"]',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(
				withPackageFile({
					selectedProjectId: 'P1',
					selectedWorkflowIds: ['WFA', 'WFB'],
					deletedWorkflowIds: ['WFC'],
					workflowConflictPolicy: 'new-version',
					workflowIdPolicy: 'source',
					overwriteDeletionPolicy: 'archive',
				}),
			);
		}
	});

	it('accepts an empty selectedWorkflowIds array', () => {
		const result = ImportPackageSelectionRequestDto.safeParse(
			withPackageFile({
				selectedProjectId: 'P1',
				selectedWorkflowIds: '[]',
			}),
		);
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

	it('rejects a missing package', () => {
		const { package: _package, ...rest } = base;
		expect(ImportPackageSelectionRequestDto.safeParse(rest).success).toBe(false);
	});

	it('rejects an absent selectedWorkflowIds key', () => {
		const { selectedWorkflowIds: _selectedWorkflowIds, ...rest } = base;
		expect(ImportPackageSelectionRequestDto.safeParse(rest).success).toBe(false);
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
			ImportPackageSelectionRequestDto.safeParse(
				withPackageFile({ selectedProjectId: 'P1', selectedWorkflowIds }),
			).success,
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
		{ name: 'absent', request: withPackageFile({ selectedWorkflowIds: '["WFA"]' }) },
		{
			name: 'empty',
			request: withPackageFile({ selectedProjectId: '', selectedWorkflowIds: '["WFA"]' }),
		},
		{
			name: 'whitespace-only',
			request: withPackageFile({ selectedProjectId: '   ', selectedWorkflowIds: '["WFA"]' }),
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
				overwriteDeletionPolicy: '',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.workflowConflictPolicy).toBe('new-version');
				expect(result.data.workflowIdPolicy).toBe('source');
				expect(result.data.overwriteDeletionPolicy).toBe('archive');
			}
		});

		it('accepts explicit values', () => {
			const result = ImportPackageSelectionRequestDto.safeParse({
				...base,
				workflowConflictPolicy: 'skip',
				workflowIdPolicy: 'new',
				overwriteDeletionPolicy: 'hard-delete',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.workflowConflictPolicy).toBe('skip');
				expect(result.data.workflowIdPolicy).toBe('new');
				expect(result.data.overwriteDeletionPolicy).toBe('hard-delete');
			}
		});

		it.each([
			{ field: 'workflowConflictPolicy', value: 'overwrite' },
			{ field: 'workflowIdPolicy', value: 'reuse' },
			{ field: 'overwriteDeletionPolicy', value: 'purge' },
		])('rejects an unsupported $field value', ({ field, value }) => {
			expect(ImportPackageSelectionRequestDto.safeParse({ ...base, [field]: value }).success).toBe(
				false,
			);
		});
	});

	it('rejects a target projectId/folderId, the locked cherry-pick policies, and bindings', () => {
		const result = ImportPackageSelectionRequestDto.safeParse({
			...base,
			projectId: 'proj-1',
			folderId: 'fld-1',
			folderConflictPolicy: 'overwrite',
			tagConflictPolicy: 'fail',
			projectConflictPolicy: 'overwrite',
			bindings: '{"credentials":{"a":"b"}}',
		});
		// The strict DTO rejects an unrecognized key instead of silently stripping it.
		expect(result.success).toBe(false);
	});

	it('lists the selection fields as multipart form fields', () => {
		expect(IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS).toEqual([
			'selectedProjectId',
			'selectedWorkflowIds',
			'deletedWorkflowIds',
			'workflowConflictPolicy',
			'workflowIdPolicy',
			'overwriteDeletionPolicy',
		]);
	});
});
