import { ImportPackageRequestDto } from '../import-package-request.dto';

describe('ImportPackageRequestDto', () => {
	it('accepts omitted routing fields', () => {
		expect(ImportPackageRequestDto.safeParse({ workflowConflictPolicy: 'fail' }).success).toBe(
			true,
		);
	});

	it('treats empty projectId and folderId as omitted', () => {
		const result = ImportPackageRequestDto.safeParse({
			projectId: '',
			folderId: '   ',
			workflowConflictPolicy: 'fail',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ workflowConflictPolicy: 'fail' });
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
				workflowConflictPolicy: 'new-version',
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
			expect(result.data).toEqual({ projectId: 'proj-1', workflowConflictPolicy: 'skip' });
		}
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
