import {
	effectiveReviewRequirement,
	projectRequirementLockedBy,
	rejectsTurningRequirementOff,
	reviewRequirementLockedBy,
} from '../workflow-review-enforcement.rule';

describe('workflow review enforcement rule', () => {
	test('a requirement is on when any scope sets it', () => {
		expect(effectiveReviewRequirement({ instance: false, project: false, workflow: false })).toBe(
			false,
		);
		expect(effectiveReviewRequirement({ instance: true, project: false, workflow: false })).toBe(
			true,
		);
		expect(effectiveReviewRequirement({ instance: false, project: true, workflow: false })).toBe(
			true,
		);
		expect(effectiveReviewRequirement({ instance: false, project: false, workflow: true })).toBe(
			true,
		);
	});

	test('the lock is the highest scope that already requires approval', () => {
		expect(reviewRequirementLockedBy({ instance: true, project: true, workflow: false })).toBe(
			'instance',
		);
		expect(reviewRequirementLockedBy({ instance: false, project: true, workflow: false })).toBe(
			'project',
		);
		expect(reviewRequirementLockedBy({ instance: false, project: false, workflow: true })).toBe(
			null,
		);
	});

	test('a project row is locked only by the instance', () => {
		expect(projectRequirementLockedBy(true)).toBe('instance');
		expect(projectRequirementLockedBy(false)).toBe(null);
	});

	test('a lower scope cannot turn a higher requirement off', () => {
		expect(rejectsTurningRequirementOff(true, false)).toBe(true);
		expect(rejectsTurningRequirementOff(true, true)).toBe(false);
		expect(rejectsTurningRequirementOff(false, false)).toBe(false);
	});
});
