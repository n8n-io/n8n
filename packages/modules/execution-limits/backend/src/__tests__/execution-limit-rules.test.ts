import {
	findDuplicateProjectIds,
	diffProjectLimits,
	findProjectLimitsAboveInstanceLimit,
	diffLimitSettings,
	isDefaultProjectLimitAboveInstanceLimit,
} from '../execution-limit-rules';

describe('findDuplicateProjectIds', () => {
	it('returns each project that occurs more than one time, one time', () => {
		const limits = [
			{ projectId: 'a', maxExecutions: 1 },
			{ projectId: 'b', maxExecutions: 2 },
			{ projectId: 'a', maxExecutions: 3 },
			{ projectId: 'a', maxExecutions: 4 },
		];

		expect(findDuplicateProjectIds(limits)).toEqual(['a']);
	});

	it('returns nothing when each project occurs one time', () => {
		const limits = [
			{ projectId: 'a', maxExecutions: 1 },
			{ projectId: 'b', maxExecutions: 1 },
		];

		expect(findDuplicateProjectIds(limits)).toEqual([]);
	});
});

describe('findProjectLimitsAboveInstanceLimit', () => {
	const limits = [
		{ projectId: 'below', maxExecutions: 99 },
		{ projectId: 'equal', maxExecutions: 100 },
		{ projectId: 'above', maxExecutions: 101 },
	];

	it('returns only the projects with a limit higher than the instance limit', () => {
		expect(findProjectLimitsAboveInstanceLimit(limits, 100)).toEqual(['above']);
	});

	it('returns nothing when the instance has no limit', () => {
		expect(findProjectLimitsAboveInstanceLimit(limits, null)).toEqual([]);
	});
});

describe('isDefaultProjectLimitAboveInstanceLimit', () => {
	it.each([
		[100, 101, true],
		[100, 100, false],
		[null, 101, false],
		[100, null, false],
	])(
		'with instance limit %s and default %s returns %s',
		(instanceMaxExecutions, defaultProjectMaxExecutions, expected) => {
			const settings = {
				periodUnit: 'month' as const,
				instanceMaxExecutions,
				defaultProjectMaxExecutions,
			};

			expect(isDefaultProjectLimitAboveInstanceLimit(settings)).toBe(expected);
		},
	);
});

describe('diffLimitSettings', () => {
	const before = {
		periodUnit: 'month' as const,
		instanceMaxExecutions: 100,
		defaultProjectMaxExecutions: null,
	};

	it('returns one change for each setting with a new value', () => {
		const after = { ...before, periodUnit: 'week' as const, instanceMaxExecutions: null };

		expect(diffLimitSettings(before, after)).toEqual([
			{ projectId: null, field: 'periodUnit', oldValue: 'month', newValue: 'week' },
			{ projectId: null, field: 'instanceMaxExecutions', oldValue: 100, newValue: null },
		]);
	});

	it('returns nothing when no setting has a new value', () => {
		expect(diffLimitSettings(before, { ...before })).toEqual([]);
	});
});

describe('diffProjectLimits', () => {
	it('returns the set, changed and removed limits and leaves out the equal ones', () => {
		const before = [
			{ projectId: 'changed', maxExecutions: 10 },
			{ projectId: 'equal', maxExecutions: 10 },
			{ projectId: 'removed', maxExecutions: 10 },
		];
		const after = [
			{ projectId: 'set', maxExecutions: 20 },
			{ projectId: 'changed', maxExecutions: 20 },
			{ projectId: 'equal', maxExecutions: 10 },
		];

		expect(diffProjectLimits(before, after)).toEqual([
			{ projectId: 'set', field: 'projectMaxExecutions', oldValue: null, newValue: 20 },
			{ projectId: 'changed', field: 'projectMaxExecutions', oldValue: 10, newValue: 20 },
			{ projectId: 'removed', field: 'projectMaxExecutions', oldValue: 10, newValue: null },
		]);
	});
});
