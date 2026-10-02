import {
	ImportPackageSelectionRequestDto,
	IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS,
} from '../import-package-request.dto';

/** Matches `publicApiUploadedFileSchema`, the shape multer hands the registry for a parsed file part. */
function packageFile() {
	return {
		fieldname: 'package',
		originalname: 'export.n8np',
		mimetype: 'application/gzip',
		size: 5,
		buffer: new Uint8Array([1, 2, 3, 4, 5]),
	};
}

describe('ImportPackageSelectionRequestDto', () => {
	const base = {
		package: packageFile(),
		selectedProjectId: 'P1',
		selectedWorkflowIds: '["WFA","WFB"]',
	};

	it('parses selectedWorkflowIds from a JSON array string and defaults the overridable policies', () => {
		const result = ImportPackageSelectionRequestDto.safeParse(base);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				package: packageFile(),
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
				package: packageFile(),
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
			package: packageFile(),
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

	it('rejects a request missing the package file', () => {
		expect(
			ImportPackageSelectionRequestDto.safeParse({
				selectedProjectId: 'P1',
				selectedWorkflowIds: '["WFA"]',
			}).success,
		).toBe(false);
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
			ImportPackageSelectionRequestDto.safeParse({
				package: packageFile(),
				selectedProjectId: 'P1',
				selectedWorkflowIds,
			}).success,
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
		{ name: 'absent', request: { package: packageFile(), selectedWorkflowIds: '["WFA"]' } },
		{
			name: 'empty',
			request: { package: packageFile(), selectedProjectId: '', selectedWorkflowIds: '["WFA"]' },
		},
		{
			name: 'whitespace-only',
			request: {
				package: packageFile(),
				selectedProjectId: '   ',
				selectedWorkflowIds: '["WFA"]',
			},
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

	it('rejects a target projectId/folderId, the locked cherry-pick policies, and bindings (strict schema)', () => {
		const rejectedExtras = [
			{ projectId: 'proj-1' },
			{ folderId: 'fld-1' },
			{ folderConflictPolicy: 'overwrite' },
			{ tagConflictPolicy: 'fail' },
			{ projectConflictPolicy: 'overwrite' },
			{ overwriteDeletionPolicy: 'hard-delete' },
			{ bindings: '{"credentials":{"a":"b"}}' },
		];

		for (const extra of rejectedExtras) {
			expect(ImportPackageSelectionRequestDto.safeParse({ ...base, ...extra }).success).toBe(false);
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
