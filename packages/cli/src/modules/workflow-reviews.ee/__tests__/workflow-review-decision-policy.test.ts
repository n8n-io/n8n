import {
	resolveDecisionCapability,
	type WorkflowReviewDecisionFacts,
} from '../workflow-review-decision-policy';

/**
 * The one rule behind two presentations: `decide()` turns a refusal into a 403 or a
 * hiding 404, and the detail read turns it into `viewerCanDecide` plus a reason. The
 * table below is the whole rule, so those two suites only have to cover how they
 * present the answer.
 */
describe('who may decide a review', () => {
	const facts = (overrides: Partial<WorkflowReviewDecisionFacts> = {}) => ({
		canReadEveryWorkflow: true,
		isAuthor: false,
		isAssignedReviewer: false,
		hasAdminOverride: false,
		...overrides,
	});

	it.each([
		['an assigned reviewer', { isAssignedReviewer: true }],
		['an admin', { hasAdminOverride: true }],
		[
			'an assigned reviewer who also authored a version',
			{
				isAssignedReviewer: true,
				isAuthor: true,
			},
		],
		['an admin who authored the review', { hasAdminOverride: true, isAuthor: true }],
	])('lets %s decide', (_who, overrides) => {
		expect(resolveDecisionCapability(facts(overrides))).toEqual({ allowed: true });
	});

	it('stops an author who is neither an assigned reviewer nor an admin, and says why', () => {
		expect(resolveDecisionCapability(facts({ isAuthor: true }))).toEqual({
			allowed: false,
			reason: 'author',
		});
	});

	it('stops an uninvolved reader, and says they are not a reviewer', () => {
		expect(resolveDecisionCapability(facts())).toEqual({
			allowed: false,
			reason: 'missing_reviewer_permission',
		});
	});

	// Read access is the floor, checked first so someone who cannot see every
	// covered workflow hears about the permission rather than about their authorship.
	it.each([
		['an author', { isAuthor: true }],
		['an assigned reviewer', { isAssignedReviewer: true }],
		['an admin', { hasAdminOverride: true }],
		['an uninvolved reader', {}],
	])('tells %s who cannot read every covered workflow about the permission', (_who, overrides) => {
		expect(resolveDecisionCapability(facts({ ...overrides, canReadEveryWorkflow: false }))).toEqual(
			{ allowed: false, reason: 'missing_permission' },
		);
	});
});
