import { ImportPackageRequestDto } from '../import-package-request.dto';

describe('ImportPackageRequestDto', () => {
	it('accepts omitted routing fields and defaults credential modes', () => {
		const result = ImportPackageRequestDto.safeParse({ workflowConflictPolicy: 'fail' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'must-preexist',
				workflowConflictPolicy: 'fail',
				dryRun: false,
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
				credentialMissingMode: 'must-preexist',
				workflowConflictPolicy: 'fail',
				dryRun: false,
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
				credentialMissingMode: 'must-preexist',
				workflowConflictPolicy: 'new-version',
				dryRun: false,
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
				credentialMissingMode: 'must-preexist',
				workflowConflictPolicy: 'skip',
				dryRun: false,
			});
		}
	});

	it.each([
		{ input: 'true', expected: true },
		{ input: 'TRUE', expected: true },
		{ input: '  true  ', expected: true },
		{ input: 'false', expected: false },
		{ input: 'anything-else', expected: false },
	])('coerces dryRun "$input" to $expected', ({ input, expected }) => {
		const result = ImportPackageRequestDto.safeParse({
			workflowConflictPolicy: 'fail',
			dryRun: input,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dryRun).toBe(expected);
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
				credentialMissingMode: 'create-stub',
				workflowConflictPolicy: 'fail',
			}).success,
		).toBe(false);
	});

	it('rejects omitted workflowConflictPolicy', () => {
		expect(ImportPackageRequestDto.safeParse({}).success).toBe(false);
	});

	it.each([
		{ name: 'non-string projectId', request: { projectId: 1, workflowConflictPolicy: 'fail' } },
		{ name: 'non-string folderId', request: { folderId: false, workflowConflictPolicy: 'fail' } },
		{ name: 'unknown workflowConflictPolicy', request: { workflowConflictPolicy: 'overwrite' } },
	])('rejects $name', ({ request }) => {
		expect(ImportPackageRequestDto.safeParse(request).success).toBe(false);
	});
});
