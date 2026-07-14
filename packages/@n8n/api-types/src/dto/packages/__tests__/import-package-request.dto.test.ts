import { ImportPackageRequestDto } from '../import-package-request.dto';

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
				folderConflictPolicy: 'merge',
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
				folderConflictPolicy: 'merge',
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
				folderConflictPolicy: 'merge',
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
				folderConflictPolicy: 'merge',
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

	it.each([
		{ name: 'non-string projectId', request: { projectId: 1, workflowConflictPolicy: 'fail' } },
		{ name: 'non-string folderId', request: { folderId: false, workflowConflictPolicy: 'fail' } },
		{ name: 'unknown workflowConflictPolicy', request: { workflowConflictPolicy: 'overwrite' } },
	])('rejects $name', ({ request }) => {
		expect(ImportPackageRequestDto.safeParse(request).success).toBe(false);
	});
});
