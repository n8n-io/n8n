import {
	ImportPackageRequestDto,
	IMPORT_PACKAGE_REQUEST_FORM_FIELDS,
} from '../import-package-request.dto';

describe('ImportPackageRequestDto', () => {
	it('accepts omitted routing fields and defaults credential modes', () => {
		const result = ImportPackageRequestDto.safeParse({ workflowConflictPolicy: 'fail' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'create-stub',
				bindings: {},
				workflowConflictPolicy: 'fail',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
				missingNodeTypeMode: 'fail',
				folderConflictPolicy: 'merge',
				dataTableMatchingMode: 'by-id',
				dataTableMissingMode: 'create',
				dataTableSchemaConflictPolicy: 'keep-existing',
				variableMissingMode: 'do-nothing',
			});
		}
	});

	it('treats empty projectId and folderId as omitted', () => {
		const result = ImportPackageRequestDto.safeParse({
			projectId: '',
			folderId: '   ',
			workflowConflictPolicy: 'fail',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'create-stub',
				bindings: {},
				workflowConflictPolicy: 'fail',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
				missingNodeTypeMode: 'fail',
				folderConflictPolicy: 'merge',
				dataTableMatchingMode: 'by-id',
				dataTableMissingMode: 'create',
				dataTableSchemaConflictPolicy: 'keep-existing',
				variableMissingMode: 'do-nothing',
			});
		}
	});

	it('trims non-empty ids', () => {
		const result = ImportPackageRequestDto.safeParse({
			projectId: '  proj-1  ',
			folderId: 'fld-1',
			workflowConflictPolicy: 'new-version',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				projectId: 'proj-1',
				folderId: 'fld-1',
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'create-stub',
				bindings: {},
				workflowConflictPolicy: 'new-version',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
				missingNodeTypeMode: 'fail',
				folderConflictPolicy: 'merge',
				dataTableMatchingMode: 'by-id',
				dataTableMissingMode: 'create',
				dataTableSchemaConflictPolicy: 'keep-existing',
				variableMissingMode: 'do-nothing',
			});
		}
	});

	it('strips unknown keys such as the package placeholder', () => {
		const result = ImportPackageRequestDto.safeParse({
			projectId: 'proj-1',
			workflowConflictPolicy: 'skip',
			package: '',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				projectId: 'proj-1',
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'create-stub',
				bindings: {},
				workflowConflictPolicy: 'skip',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
				missingNodeTypeMode: 'fail',
				folderConflictPolicy: 'merge',
				dataTableMatchingMode: 'by-id',
				dataTableMissingMode: 'create',
				dataTableSchemaConflictPolicy: 'keep-existing',
				variableMissingMode: 'do-nothing',
			});
		}
	});

	it.each(['id-only', 'name-and-type', 'type-only'] as const)(
		'accepts %s as a credentialMatchingMode value',
		(credentialMatchingMode) => {
			const result = ImportPackageRequestDto.safeParse({
				credentialMatchingMode,
				workflowConflictPolicy: 'fail',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialMatchingMode).toBe(credentialMatchingMode);
			}
		},
	);

	it('rejects unsupported credentialMatchingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse({
				credentialMatchingMode: 'fuzzy-match',
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
	});

	it('rejects unsupported credentialMissingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse({
				credentialMissingMode: 'auto-create',
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
	});

	it.each(['create', 'must-preexist', 'do-nothing'] as const)(
		'accepts %s as a dataTableMissingMode value',
		(dataTableMissingMode) => {
			const result = ImportPackageRequestDto.safeParse({
				dataTableMissingMode,
				workflowConflictPolicy: 'fail',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dataTableMissingMode).toBe(dataTableMissingMode);
			}
		},
	);

	it('rejects unsupported dataTableMissingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse({
				dataTableMissingMode: 'recreate',
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
	});

	it('rejects unsupported dataTableMatchingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse({
				dataTableMatchingMode: 'by-name',
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
	});

	it.each(['keep-existing', 'fail'] as const)(
		'accepts %s as a dataTableSchemaConflictPolicy value',
		(dataTableSchemaConflictPolicy) => {
			const result = ImportPackageRequestDto.safeParse({
				dataTableSchemaConflictPolicy,
				workflowConflictPolicy: 'fail',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dataTableSchemaConflictPolicy).toBe(dataTableSchemaConflictPolicy);
			}
		},
	);

	it('rejects unsupported dataTableSchemaConflictPolicy values', () => {
		expect(
			ImportPackageRequestDto.safeParse({
				dataTableSchemaConflictPolicy: 'merge',
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
	});

	it('accepts create-stub credentialMissingMode', () => {
		const result = ImportPackageRequestDto.safeParse({
			credentialMissingMode: 'create-stub',
			workflowConflictPolicy: 'fail',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.credentialMissingMode).toBe('create-stub');
		}
	});

	it('parses bindings from a JSON object string keyed by entity type', () => {
		const result = ImportPackageRequestDto.safeParse({
			bindings: '{"credentials":{"source-cred":"target-cred"}}',
			workflowConflictPolicy: 'fail',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.bindings).toEqual({ credentials: { 'source-cred': 'target-cred' } });
		}
	});

	it.each([
		{ name: 'invalid JSON', bindings: 'not json' },
		{ name: 'array JSON', bindings: '[]' },
		{ name: 'non-object credentials map', bindings: '{"credentials":"nope"}' },
		{ name: 'non-string target id', bindings: '{"credentials":{"source":1}}' },
		{ name: 'empty source id', bindings: '{"credentials":{"":"target"}}' },
		{ name: 'empty target id', bindings: '{"credentials":{"source":""}}' },
		{ name: 'a misspelled credentials key', bindings: '{"credential":{"source":"target"}}' },
		{ name: 'an unsupported workflows key', bindings: '{"workflows":{"source":"target"}}' },
		{
			name: 'a mix of known and unknown keys',
			bindings: '{"credentials":{"source":"target"},"nope":{"a":"b"}}',
		},
	])('rejects bindings with $name', ({ bindings }) => {
		expect(
			ImportPackageRequestDto.safeParse({
				bindings,
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
	});

	it('names the offending key when bindings use an unknown entity type', () => {
		const result = ImportPackageRequestDto.safeParse({
			bindings: '{"credential":{"source":"target"}}',
			workflowConflictPolicy: 'fail',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			const message = result.error.errors.map((issue) => issue.message).join('; ');
			expect(message).toContain('Unrecognized key');
			expect(message).toContain('credential');
		}
	});

	it('rejects omitted workflowConflictPolicy', () => {
		expect(ImportPackageRequestDto.safeParse({}).success).toBe(false);
	});

	describe('workflowIdPolicy', () => {
		it('defaults to "new" when omitted', () => {
			const result = ImportPackageRequestDto.safeParse({ workflowConflictPolicy: 'fail' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.workflowIdPolicy).toBe('new');
			}
		});

		it('accepts "source"', () => {
			const result = ImportPackageRequestDto.safeParse({
				workflowConflictPolicy: 'fail',
				workflowIdPolicy: 'source',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.workflowIdPolicy).toBe('source');
			}
		});

		it('rejects unsupported workflowIdPolicy values', () => {
			expect(
				ImportPackageRequestDto.safeParse({
					workflowConflictPolicy: 'fail',
					workflowIdPolicy: 'reuse',
				}).success,
			).toBe(false);
		});
	});

	describe('missingNodeTypeMode', () => {
		it('defaults to "fail" when omitted', () => {
			const result = ImportPackageRequestDto.safeParse({ workflowConflictPolicy: 'fail' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.missingNodeTypeMode).toBe('fail');
			}
		});

		it('accepts "import-anyway"', () => {
			const result = ImportPackageRequestDto.safeParse({
				workflowConflictPolicy: 'fail',
				missingNodeTypeMode: 'import-anyway',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.missingNodeTypeMode).toBe('import-anyway');
			}
		});

		it('rejects unsupported missingNodeTypeMode values', () => {
			expect(
				ImportPackageRequestDto.safeParse({
					workflowConflictPolicy: 'fail',
					missingNodeTypeMode: 'skip',
				}).success,
			).toBe(false);
		});

		it('is accepted as a multipart form field', () => {
			expect(IMPORT_PACKAGE_REQUEST_FORM_FIELDS).toContain('missingNodeTypeMode');
		});
	});

	it.each([
		{ name: 'non-string projectId', request: { projectId: 1, workflowConflictPolicy: 'fail' } },
		{ name: 'non-string folderId', request: { folderId: false, workflowConflictPolicy: 'fail' } },
		{ name: 'unknown workflowConflictPolicy', request: { workflowConflictPolicy: 'overwrite' } },
	])('rejects $name', ({ request }) => {
		expect(ImportPackageRequestDto.safeParse(request).success).toBe(false);
	});

	describe('variableMissingMode', () => {
		it('defaults variableMissingMode to do-nothing when omitted', () => {
			const result = ImportPackageRequestDto.safeParse({ workflowConflictPolicy: 'fail' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.variableMissingMode).toBe('do-nothing');
			}
		});

		it.each(['do-nothing', 'must-preexist'] as const)(
			'accepts %s as a variableMissingMode value',
			(variableMissingMode) => {
				const result = ImportPackageRequestDto.safeParse({
					variableMissingMode,
					workflowConflictPolicy: 'fail',
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.variableMissingMode).toBe(variableMissingMode);
				}
			},
		);

		it('rejects unsupported variableMissingMode values', () => {
			expect(
				ImportPackageRequestDto.safeParse({
					variableMissingMode: 'invent-variables',
					workflowConflictPolicy: 'fail',
				}).success,
			).toBe(false);
		});
	});
});
