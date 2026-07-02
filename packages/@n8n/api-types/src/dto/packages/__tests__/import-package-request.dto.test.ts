import { ImportPackageRequestDto } from '../import-package-request.dto';

describe('ImportPackageRequestDto', () => {
	it('accepts omitted routing fields and defaults credential modes', () => {
		const result = ImportPackageRequestDto.safeParse({ workflowConflictPolicy: 'fail' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'create-stub',
				credentialBindings: {},
				workflowConflictPolicy: 'fail',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
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
				credentialBindings: {},
				workflowConflictPolicy: 'fail',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
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
				credentialBindings: {},
				workflowConflictPolicy: 'new-version',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
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
				credentialBindings: {},
				workflowConflictPolicy: 'skip',
				workflowPublishingPolicy: 'preserve-published-state',
				workflowIdPolicy: 'new',
			});
		}
	});

	it('rejects unsupported credentialMatchingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse({
				credentialMatchingMode: 'name-and-type',
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

	it('parses credentialBindings from a JSON object string', () => {
		const result = ImportPackageRequestDto.safeParse({
			credentialBindings: '{"source-cred":"target-cred"}',
			workflowConflictPolicy: 'fail',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.credentialBindings).toEqual({ 'source-cred': 'target-cred' });
		}
	});

	it.each([
		{ name: 'invalid JSON', credentialBindings: 'not json' },
		{ name: 'array JSON', credentialBindings: '[]' },
		{ name: 'non-string target id', credentialBindings: '{"source":1}' },
		{ name: 'empty source id', credentialBindings: '{"":"target"}' },
		{ name: 'empty target id', credentialBindings: '{"source":""}' },
	])('rejects credentialBindings with $name', ({ credentialBindings }) => {
		expect(
			ImportPackageRequestDto.safeParse({
				credentialBindings,
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
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
