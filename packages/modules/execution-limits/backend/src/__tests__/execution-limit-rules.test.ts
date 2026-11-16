import {
	findDuplicateProjectIds,
	findProjectLimitsAboveInstanceLimit,
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
