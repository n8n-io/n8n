import type {
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';

import WorkflowReviewDetailTabs from './WorkflowReviewDetailTabs.vue';

vi.mock('./WorkflowReviewChangesSection.vue', () => ({
	default: {
		name: 'WorkflowReviewChangesSection',
		props: ['workflow'],
		template: '<div data-test-id="workflow-review-changes-section" />',
	},
}));

vi.mock('./WorkflowReviewActivityFeed.vue', () => ({
	default: {
		name: 'WorkflowReviewActivityFeed',
		template: '<div data-test-id="workflow-review-activity-feed"><slot name="header" /></div>',
	},
}));

vi.mock('./WorkflowReviewCommentComposer.vue', () => ({
	default: {
		name: 'WorkflowReviewCommentComposer',
		props: ['canComment'],
		template:
			'<div data-test-id="workflow-review-comment-composer" :data-can-comment="canComment" />',
	},
}));

vi.mock('./WorkflowReviewDetailMetadata.vue', () => ({
	default: {
		name: 'WorkflowReviewDetailMetadata',
		template: '<aside data-test-id="workflow-review-detail-metadata" />',
	},
}));

// The real popover cannot open in jsdom (Reka UI), so expose what this component passes
// down as attributes and let a button stand in for the comment it reports back.
vi.mock('./WorkflowReviewDecisionPopover.vue', () => ({
	default: {
		name: 'WorkflowReviewDecisionPopover',
		props: ['deciding', 'viewerCanDecide', 'viewerCanComment', 'ineligibilityHint'],
		template: `
			<div
				data-test-id="workflow-review-decision-popover"
				:data-can-decide="viewerCanDecide"
				:data-ineligibility-hint="ineligibilityHint"
			>
				<button data-test-id="emit-comment-posted" @click="$emit('comment-posted')" />
			</div>`,
	},
}));

const renderComponent = createComponentRenderer(WorkflowReviewDetailTabs);

function makeInboxItem(overrides: Partial<WorkflowReviewInboxItem> = {}): WorkflowReviewInboxItem {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Needs review',
		workflowName: 'My workflow',
		workflowVersionId: null,
		requester: null,
		authors: [],
		reviewers: [],
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	};
}

function makeWorkflowDetail(
	overrides: Partial<WorkflowReviewRequestWorkflowDetail> = {},
): WorkflowReviewRequestWorkflowDetail {
	return {
		workflowId: 'wf-1',
		workflowName: 'My workflow',
		workflowVersionId: 'version-1',
		pinnedVersion: null,
		baselineVersion: null,
		...overrides,
	};
}

function makeDetail(
	overrides: Partial<WorkflowReviewRequestDetail> = {},
): WorkflowReviewRequestDetail {
	return {
		...makeInboxItem(),
		description: null,
		workflows: [makeWorkflowDetail()],
		viewerCanDecide: true,
		viewerDecisionIneligibilityReason: null,
		viewerCanComment: true,
		...overrides,
	};
}

describe('WorkflowReviewDetailTabs', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('lets the viewer switch between the Activity and Changes tabs', async () => {
		const { getByText, emitted } = renderComponent({
			props: { review: makeDetail(), tab: 'activity', deciding: false },
		});

		getByText('Changes').click();

		expect(emitted('update:tab')).toEqual([['changes']]);
	});

	describe('activity tab', () => {
		it('renders the description when present', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					review: makeDetail({ description: 'Adds retry logic' }),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-description')).toHaveTextContent('Adds retry logic');
			expect(queryByTestId('workflow-review-no-description')).not.toBeInTheDocument();
		});

		it('renders a fallback when the review has no description', () => {
			const { getByTestId } = renderComponent({
				props: { review: makeDetail(), tab: 'activity', deciding: false },
			});

			expect(getByTestId('workflow-review-no-description')).toBeInTheDocument();
		});

		// The description has to sit inside the feed's scroll container for the two to scroll
		// together, and the composer has to stay outside it to keep its place at the bottom.
		it('scrolls the description with the feed and keeps the composer below both', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ description: 'Adds retry logic' }),
					tab: 'activity',
					deciding: false,
				},
			});

			const feed = getByTestId('workflow-review-activity-feed');
			const description = getByTestId('workflow-review-description');
			const composer = getByTestId('workflow-review-comment-composer');

			expect(feed).toContainElement(description);
			expect(feed.compareDocumentPosition(composer)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		});

		it.each([
			['lets a viewer who may comment use the composer', true],
			['locks the composer for a viewer who may not', false],
		])('%s', (_label, viewerCanComment) => {
			const { getByTestId } = renderComponent({
				props: { review: makeDetail({ viewerCanComment }), tab: 'activity', deciding: false },
			});

			expect(getByTestId('workflow-review-comment-composer')).toHaveAttribute(
				'data-can-comment',
				String(viewerCanComment),
			);
		});

		it('defaults the composer to read-only on a review whose detail never loaded', () => {
			const { getByTestId } = renderComponent({
				props: { review: makeInboxItem(), tab: 'activity', deciding: false },
			});

			expect(getByTestId('workflow-review-comment-composer')).toHaveAttribute(
				'data-can-comment',
				'false',
			);
		});

		it('still lets the viewer comment on a closed review', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', decision: 'approved' }),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-activity-feed')).toBeInTheDocument();
			expect(getByTestId('workflow-review-comment-composer')).toHaveAttribute(
				'data-can-comment',
				'true',
			);
		});
	});

	describe('changes tab', () => {
		it('renders one section per workflow', () => {
			const { getAllByTestId } = renderComponent({
				props: {
					review: makeDetail({
						workflows: [
							makeWorkflowDetail(),
							makeWorkflowDetail({ workflowId: 'wf-2', workflowName: 'Other workflow' }),
						],
					}),
					tab: 'changes',
					deciding: false,
				},
			});

			expect(getAllByTestId('workflow-review-changes-section')).toHaveLength(2);
		});

		it('shows an info state instead of diffs for a closed review', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', decision: 'approved' }),
					tab: 'changes',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-changes-closed')).toBeInTheDocument();
			expect(queryByTestId('workflow-review-changes-section')).not.toBeInTheDocument();
		});

		it('shows an empty state when the detail has no workflows', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ workflows: [] }),
					tab: 'changes',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-changes-empty')).toBeInTheDocument();
		});

		it('shows an error state when the detail fetch failed', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { review: makeInboxItem(), tab: 'changes', deciding: false },
			});

			expect(getByTestId('workflow-review-changes-unavailable')).toBeInTheDocument();
			expect(queryByTestId('workflow-review-changes-empty')).not.toBeInTheDocument();
		});
	});

	describe('decision actions', () => {
		// The trigger lives outside the tab panel, so a comment posted from the Changes tab
		// would otherwise succeed with nothing to show for it.
		it('switches to the activity tab once a comment was posted from the popover', () => {
			const { getByTestId, emitted } = renderComponent({
				props: { review: makeDetail(), tab: 'changes', deciding: false },
			});

			getByTestId('emit-comment-posted').click();

			expect(emitted('update:tab')).toEqual([['activity']]);
		});

		it('offers no decision on a closed review', () => {
			const { queryByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', decision: 'approved' }),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(queryByTestId('workflow-review-decision-popover')).not.toBeInTheDocument();
		});

		it('offers no decision on a review whose detail payload never loaded', () => {
			const { queryByTestId } = renderComponent({
				props: { review: makeInboxItem(), tab: 'activity', deciding: false },
			});

			expect(queryByTestId('workflow-review-decision-popover')).not.toBeInTheDocument();
		});

		it('leaves the decision actions open with no hint when the viewer can decide', () => {
			const { getByTestId } = renderComponent({
				props: { review: makeDetail(), tab: 'activity', deciding: false },
			});

			const popover = getByTestId('workflow-review-decision-popover');
			expect(popover).toHaveAttribute('data-can-decide', 'true');
			expect(popover).toHaveAttribute('data-ineligibility-hint', '');
		});

		it('says the viewer contributed a version when that is why they cannot decide', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({
						viewerCanDecide: false,
						viewerDecisionIneligibilityReason: 'author',
					}),
					tab: 'activity',
					deciding: false,
				},
			});

			const popover = getByTestId('workflow-review-decision-popover');
			expect(popover).toHaveAttribute('data-can-decide', 'false');
			expect(popover).toHaveAttribute(
				'data-ineligibility-hint',
				'You contributed a version to this review.',
			);
		});

		it('falls back to the generic permission hint for any other reason', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({
						viewerCanDecide: false,
						viewerDecisionIneligibilityReason: 'missing_reviewer_permission',
					}),
					tab: 'activity',
					deciding: false,
				},
			});

			const popover = getByTestId('workflow-review-decision-popover');
			expect(popover).toHaveAttribute('data-can-decide', 'false');
			expect(popover).toHaveAttribute(
				'data-ineligibility-hint',
				'Missing permissions to perform this action',
			);
		});
	});
});
