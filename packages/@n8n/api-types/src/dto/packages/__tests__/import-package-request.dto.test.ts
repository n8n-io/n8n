import { ImportPackageRequestDto } from '../import-package-request.dto';

describe('ImportPackageRequestDto', () => {
	it('accepts omitted routing fields and defaults credential modes', () => {
		const result = ImportPackageRequestDto.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'must-preexist',
			});
		}
	});

	it('treats empty projectId and folderId as omitted', () => {
		const result = ImportPackageRequestDto.safeParse({ projectId: '', folderId: '   ' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'must-preexist',
			});
		}
	});

	it('trims non-empty ids', () => {
		const result = ImportPackageRequestDto.safeParse({
			projectId: '  proj-1  ',
			folderId: 'fld-1',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				projectId: 'proj-1',
				folderId: 'fld-1',
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'must-preexist',
			});
		}
	});

	it('strips unknown keys such as the package placeholder', () => {
		const result = ImportPackageRequestDto.safeParse({
			projectId: 'proj-1',
			package: '',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				projectId: 'proj-1',
				credentialMatchingMode: 'id-only',
				credentialMissingMode: 'must-preexist',
			});
		}
	});

	it('rejects unsupported credentialMatchingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse({ credentialMatchingMode: 'name-and-type' }).success,
		).toBe(false);
	});

	it('rejects unsupported credentialMissingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse({ credentialMissingMode: 'create-stub' }).success,
		).toBe(false);
	});

	it.each([
		{ name: 'non-string projectId', request: { projectId: 1 } },
		{ name: 'non-string folderId', request: { folderId: false } },
	])('rejects $name', ({ request }) => {
		expect(ImportPackageRequestDto.safeParse(request).success).toBe(false);
	});
});
