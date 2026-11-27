import { diffLimitSettings } from '../execution-limit-rules';

describe('diffLimitSettings', () => {
	const before = {
		periodUnit: 'month' as const,
		instanceMaxExecutions: 100,
	};

	it('returns one change for each setting with a new value', () => {
		const after = { periodUnit: 'week' as const, instanceMaxExecutions: null };

		expect(diffLimitSettings(before, after)).toEqual([
			{ projectId: null, field: 'periodUnit', oldValue: 'month', newValue: 'week' },
			{ projectId: null, field: 'instanceMaxExecutions', oldValue: 100, newValue: null },
		]);
	});

	it('returns nothing when no setting has a new value', () => {
		expect(diffLimitSettings(before, { ...before })).toEqual([]);
	});
});
