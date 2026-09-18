import {
	ApplyPackageResultDto,
	ContinueApplyPackageDto,
	PromotePackageDto,
	applyPackageResultSchema,
} from '../promotion-operations.dto';

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

describe('ContinueApplyPackageDto', () => {
	const expectedSource = { configId: 'config1', branchName: 'main', commitSha: 'a'.repeat(40) };

	it('accepts the reviewed source identity', () => {
		expect(ContinueApplyPackageDto.parse({ expectedSource })).toEqual({ expectedSource });
	});

	it.each([
		{},
		{ expectedSource: {} },
		{ expectedSource, force: true },
		{ expectedSource, workflowIds: [] },
		{ expectedSource: { ...expectedSource, resolved: true } },
		{ expectedSource: { ...expectedSource, configId: '' } },
		{ expectedSource: { ...expectedSource, branchName: '' } },
	])('rejects missing or unsupported fields: %j', (body) => {
		expect(ContinueApplyPackageDto.safeParse(body).success).toBe(false);
	});

	it.each([
		'HEAD',
		'main~1',
		'a'.repeat(7),
		'a'.repeat(39),
		'a'.repeat(41),
		'A'.repeat(40),
		'g'.repeat(40),
	])('rejects commit identity %s', (commitSha) => {
		expect(
			ContinueApplyPackageDto.safeParse({ expectedSource: { ...expectedSource, commitSha } })
				.success,
		).toBe(false);
	});
});

describe('ApplyPackageResultDto', () => {
	const identity = {
		connectionId: 'connection1',
		configId: 'config1',
		git: { branchName: 'main', commitSha: 'a'.repeat(40) },
	};
	const preflight = { missingBindings: [], accessRequirements: [], conflicts: [], warnings: [] };

	it('retains the named response schema and parses each stopped outcome', () => {
		expect(ApplyPackageResultDto.name).toBe('ApplyPackageResultDto');
		expect(ApplyPackageResultDto.schema).toBe(applyPackageResultSchema);
		expect(
			ApplyPackageResultDto.parse({ ...identity, status: 'blocked', preflight, counts: {} }),
		).toEqual({ ...identity, status: 'blocked', preflight });
		expect(
			ApplyPackageResultDto.parse({ ...identity, status: 'source-changed', preflight, counts: {} }),
		).toEqual({ ...identity, status: 'source-changed' });
	});

	it.each([
		{ ...identity },
		{ ...identity, status: 'unknown' },
		{ ...identity, status: 'blocked' },
		{ ...identity, status: 'applied', warnings: [] },
		{ ...identity, status: 'applied', counts: {} },
	])('requires the fields for each outcome: %j', (value) => {
		expect(applyPackageResultSchema.safeParse(value).success).toBe(false);
	});
});
