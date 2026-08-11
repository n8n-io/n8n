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
		template: '<div data-test-id="workflow-review-activity-feed" />',
	},
}));

vi.mock('./WorkflowReviewDetailMetadata.vue', () => ({
	default: {
		name: 'WorkflowReviewDetailMetadata',
		template: '<aside data-test-id="workflow-review-detail-metadata" />',
	},
}));

const renderComponent = createComponentRenderer(WorkflowReviewDetailTabs, {
	global: {
		stubs: {
			N8nTooltip: {
				props: ['disabled', 'content'],
				template: `
					<div data-test-id="workflow-review-decision-tooltip" :data-disabled="disabled" :data-content="content">
						<slot />
					</div>`,
			},
		},
	},
});

function decisionButtons(getByTestId: (id: string) => HTMLElement) {
	return [
		getByTestId('workflow-review-approve-button'),
		getByTestId('workflow-review-request-changes-button'),
	];
}

/**
 * The tab bar renders a tooltip per tab, which the N8nTooltip stub matches too,
 * so walk up from the button rather than querying the test id globally.
 */
function decisionTooltip(button: HTMLElement) {
	const tooltip = button.closest('[data-test-id="workflow-review-decision-tooltip"]');
	if (!tooltip) throw new Error('decision button is not wrapped in a tooltip');
	return tooltip;
}

function makeInboxItem(overrides: Partial<WorkflowReviewInboxItem> = {}): WorkflowReviewInboxItem {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Needs review',
		workflowName: 'My workflow',
		workflowVersionId: null,
		requester: null,
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

		it('renders the feed below the description', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ description: 'Adds retry logic' }),
					tab: 'activity',
					deciding: false,
				},
			});

			const panel = getByTestId('workflow-review-activity-panel');
			const order = ['workflow-review-description', 'workflow-review-activity-feed'].map(
				(testId) => {
					const element = panel.querySelector(`[data-test-id="${testId}"]`);
					if (!element) throw new Error(`${testId} is not in the activity panel`);
					return element;
				},
			);

			expect(order[0].compareDocumentPosition(order[1])).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		});

		it('still shows the feed on a closed review', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', decision: 'approved' }),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-activity-feed')).toBeInTheDocument();
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
		it('emits decisions from the action buttons', () => {
			const { getByTestId, emitted } = renderComponent({
				props: { review: makeDetail(), tab: 'activity', deciding: false },
			});

			getByTestId('workflow-review-approve-button').click();
			getByTestId('workflow-review-request-changes-button').click();

			expect(emitted('decide')).toEqual([['approved'], ['changes_requested']]);
		});

		it('hides the action buttons for a closed review', () => {
			const { queryByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', decision: 'approved' }),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(queryByTestId('workflow-review-approve-button')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-review-request-changes-button')).not.toBeInTheDocument();
		});

		it('hides the action buttons on a review whose detail payload never loaded', () => {
			const { queryByTestId } = renderComponent({
				props: { review: makeInboxItem(), tab: 'activity', deciding: false },
			});

			expect(queryByTestId('workflow-review-approve-button')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-review-request-changes-button')).not.toBeInTheDocument();
		});

		it('disables the action buttons while deciding', () => {
			const { getByTestId } = renderComponent({
				props: { review: makeDetail(), tab: 'activity', deciding: true },
			});

			expect(getByTestId('workflow-review-approve-button')).toBeDisabled();
			expect(getByTestId('workflow-review-request-changes-button')).toBeDisabled();
		});

		// Each button carries its own tooltip, so both must agree.
		it('keeps the buttons enabled and the tooltips off when the viewer can decide', () => {
			const { getByTestId } = renderComponent({
				props: { review: makeDetail(), tab: 'activity', deciding: false },
			});

			for (const button of decisionButtons(getByTestId)) {
				expect(button).not.toBeDisabled();
				expect(decisionTooltip(button)).toHaveAttribute('data-disabled', 'true');
			}
		});

		it('disables the buttons and says why when the viewer contributed a version', () => {
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

			for (const button of decisionButtons(getByTestId)) {
				expect(button).toBeDisabled();
				expect(decisionTooltip(button)).toHaveAttribute('data-disabled', 'false');
				expect(decisionTooltip(button)).toHaveAttribute(
					'data-content',
					'You contributed a version to this review.',
				);
			}
		});

		it('falls back to the generic permission hint for any other reason', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({
						viewerCanDecide: false,
						viewerDecisionIneligibilityReason: 'missing_publish_permission',
					}),
					tab: 'activity',
					deciding: false,
				},
			});

			for (const button of decisionButtons(getByTestId)) {
				expect(button).toBeDisabled();
				expect(decisionTooltip(button)).toHaveAttribute(
					'data-content',
					'Missing permissions to perform this action',
				);
			}
		});

		it('does not emit a decision for an ineligible viewer', () => {
			const { getByTestId, emitted } = renderComponent({
				props: {
					review: makeDetail({
						viewerCanDecide: false,
						viewerDecisionIneligibilityReason: 'author',
					}),
					tab: 'activity',
					deciding: false,
				},
			});

			getByTestId('workflow-review-approve-button').click();

			expect(emitted('decide')).toBeUndefined();
		});
	});
});
