import { PromotePackageDto } from '../promotion-operations.dto';

describe('PromotePackageDto', () => {
	it('requires a non-blank commit message and accepts an optional force flag', () => {
		expect(PromotePackageDto.safeParse({ commitMessage: 'Update projects' }).success).toBe(true);
		expect(PromotePackageDto.safeParse({ commitMessage: 'Update', force: true }).success).toBe(
			true,
		);
		expect(PromotePackageDto.safeParse({}).success).toBe(false);
		expect(PromotePackageDto.safeParse({ commitMessage: '   ' }).success).toBe(false);
	});

	// The branch comes from the stored config, never from the request.
	it('rejects unknown fields, so an operation cannot be steered from the request', () => {
		expect(
			PromotePackageDto.safeParse({ commitMessage: 'Update', branchName: 'main' }).success,
		).toBe(false);
	});
});
