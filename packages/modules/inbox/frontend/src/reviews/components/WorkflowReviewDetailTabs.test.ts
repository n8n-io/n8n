import type {
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import WorkflowReviewDetailTabs from './WorkflowReviewDetailTabs.vue';

vi.mock('./WorkflowReviewChangesSection.vue', () => ({
	default: {
		name: 'WorkflowReviewChangesSection',
		props: ['workflow', 'state', 'decision'],
		template:
			'<div data-test-id="workflow-review-changes-section" :data-workflow-id="workflow.workflowId" :data-state="state" :data-decision="decision" />',
	},
}));

vi.mock('./WorkflowReviewActivityFeed.vue', async () => {
	const { computed, inject } = await import('vue');
	const { ReviewLinkedWorkflowsKey } = await import('../constants');
	return {
		default: {
			name: 'WorkflowReviewActivityFeed',
			setup() {
				const linkedWorkflows = inject(
					ReviewLinkedWorkflowsKey,
					computed(() => new Map()),
				);
				return {
					linkedWorkflowsJson: computed(() =>
						JSON.stringify(Object.fromEntries(linkedWorkflows.value)),
					),
				};
			},
			template:
				'<div data-test-id="workflow-review-activity-feed" :data-linked-workflows="linkedWorkflowsJson"><slot name="header" /><slot name="footer" /><slot name="composer" /></div>',
		},
	};
});

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

// Expose what this component passes down as attributes, and let a button stand in for the close.
vi.mock('./WorkflowReviewDecisionPopover.vue', () => ({
	default: {
		name: 'WorkflowReviewDecisionPopover',
		props: ['deciding', 'viewerCanDecide', 'viewerCanClose', 'ineligibilityHint'],
		template: `
			<div
				data-test-id="workflow-review-decision-popover"
				:data-can-decide="viewerCanDecide"
				:data-can-close="viewerCanClose"
				:data-ineligibility-hint="ineligibilityHint"
			>
				<button data-test-id="emit-close" @click="$emit('close')" />
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
		publishedVersionId: null,
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
		viewerCanClose: true,
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

		// Both go inside the feed, so they scroll with the entries.
		it('places the description and the composer inside the feed', () => {
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
			expect(feed).toContainElement(composer);
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

		it('provides the linked workflows to the feed', () => {
			const { getByTestId } = renderComponent({
				props: { review: makeDetail(), tab: 'activity', deciding: false },
			});

			expect(getByTestId('workflow-review-activity-feed')).toHaveAttribute(
				'data-linked-workflows',
				JSON.stringify({
					'wf-1': {
						workflowName: 'My workflow',
						pinnedVersionId: 'version-1',
						pinnedVersionName: null,
					},
				}),
			);
		});

		describe('closed-state callout', () => {
			it('celebrates a review that was approved and published', () => {
				const { getByTestId } = renderComponent({
					props: {
						review: makeDetail({
							state: 'closed',
							decision: 'approved',
							workflows: [makeWorkflowDetail({ publishedVersionId: 'version-1' })],
						}),
						tab: 'activity',
						deciding: false,
					},
				});

				const callout = getByTestId('workflow-review-closed-callout');
				expect(callout).toHaveTextContent('Submission closed');
				expect(callout).toHaveTextContent(
					'The review was approved and the workflow was published.',
				);
			});

			it('shows no callout while the review is open', () => {
				const { queryByTestId } = renderComponent({
					props: { review: makeDetail(), tab: 'activity', deciding: false },
				});

				expect(queryByTestId('workflow-review-closed-callout')).not.toBeInTheDocument();
			});

			it('shows no callout when the approved version is not the published one', () => {
				const { queryByTestId } = renderComponent({
					props: {
						review: makeDetail({
							state: 'closed',
							decision: 'approved',
							workflows: [makeWorkflowDetail({ publishedVersionId: 'other-version' })],
						}),
						tab: 'activity',
						deciding: false,
					},
				});

				expect(queryByTestId('workflow-review-closed-callout')).not.toBeInTheDocument();
			});

			// A lifecycle close is already summarized by its `review.closed` feed entry,
			// which renders as a callout; a second one here would say the same thing twice.
			it('adds no summary for a review closed without an approval', () => {
				const { queryByTestId } = renderComponent({
					props: {
						review: makeDetail({ state: 'closed', decision: 'changes_requested' }),
						tab: 'activity',
						deciding: false,
					},
				});

				expect(queryByTestId('workflow-review-closed-callout')).not.toBeInTheDocument();
			});
		});

		it('still takes comments on a closed review', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', decision: 'approved' }),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-comment-composer')).toBeInTheDocument();
		});
	});

	describe('changes tab', () => {
		it('renders one item per workflow and opens only the first', () => {
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

			expect(getAllByTestId('workflow-review-changes-item')).toHaveLength(2);
			expect(getAllByTestId('workflow-review-changes-section')).toHaveLength(1);
		});

		it('keeps the open workflow when the user switches tabs', async () => {
			const review = makeDetail({
				workflows: [makeWorkflowDetail(), makeWorkflowDetail({ workflowId: 'wf-2' })],
			});
			const { getAllByTestId, getByTestId, rerender } = renderComponent({
				props: { review, tab: 'changes', deciding: false },
			});

			await userEvent.click(getAllByTestId('workflow-review-changes-item-trigger')[1]);
			await rerender({ review, tab: 'activity', deciding: false });
			await rerender({ review, tab: 'changes', deciding: false });

			expect(getByTestId('workflow-review-changes-section')).toHaveAttribute(
				'data-workflow-id',
				'wf-2',
			);
		});

		it('opens the first workflow again when another review is selected', async () => {
			const workflows = [makeWorkflowDetail(), makeWorkflowDetail({ workflowId: 'wf-2' })];
			const { getAllByTestId, getByTestId, rerender } = renderComponent({
				props: { review: makeDetail({ workflows }), tab: 'changes', deciding: false },
			});

			await userEvent.click(getAllByTestId('workflow-review-changes-item-trigger')[1]);
			await rerender({
				review: makeDetail({ id: 'req-2', workflows }),
				tab: 'changes',
				deciding: false,
			});

			expect(getByTestId('workflow-review-changes-section')).toHaveAttribute(
				'data-workflow-id',
				'wf-1',
			);
		});

		// The detail lists only the workflows the viewer can read, so a refresh can drop one.
		it('opens the first workflow when a refresh removes the open one', async () => {
			const first = makeWorkflowDetail();
			const third = makeWorkflowDetail({ workflowId: 'wf-3' });
			const { getAllByTestId, findByTestId, rerender } = renderComponent({
				props: {
					review: makeDetail({
						workflows: [first, makeWorkflowDetail({ workflowId: 'wf-2' }), third],
					}),
					tab: 'changes',
					deciding: false,
				},
			});

			await userEvent.click(getAllByTestId('workflow-review-changes-item-trigger')[1]);
			await rerender({
				review: makeDetail({ workflows: [first, third] }),
				tab: 'changes',
				deciding: false,
			});

			expect(await findByTestId('workflow-review-changes-section')).toHaveAttribute(
				'data-workflow-id',
				'wf-1',
			);
		});

		// A closed review keeps its diff: the backend serves the baseline frozen at
		// approval, and the section needs the lifecycle to phrase the sides.
		it('renders the diff for a closed review and forwards its lifecycle', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', decision: 'approved' }),
					tab: 'changes',
					deciding: false,
				},
			});

			const section = getByTestId('workflow-review-changes-section');
			expect(section).toHaveAttribute('data-state', 'closed');
			expect(section).toHaveAttribute('data-decision', 'approved');
		});

		it('shows an unavailable state when the detail has no workflows left', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({ state: 'closed', workflows: [] }),
					tab: 'changes',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-changes-workflow-unavailable')).toBeInTheDocument();
		});

		it('shows an error state when the detail fetch failed', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { review: makeInboxItem(), tab: 'changes', deciding: false },
			});

			expect(getByTestId('workflow-review-changes-unavailable')).toBeInTheDocument();
			expect(queryByTestId('workflow-review-changes-workflow-unavailable')).not.toBeInTheDocument();
		});
	});

	describe('decision actions', () => {
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

		it('lets a requester who cannot decide close the review', () => {
			const { getByTestId, emitted } = renderComponent({
				props: {
					review: makeDetail({
						viewerCanDecide: false,
						viewerDecisionIneligibilityReason: 'author',
						viewerCanClose: true,
					}),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-decision-popover')).toHaveAttribute(
				'data-can-close',
				'true',
			);
			getByTestId('emit-close').click();

			expect(emitted('close')).toHaveLength(1);
		});

		it('falls back to the generic permission hint for any other reason', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({
						viewerCanDecide: false,
						viewerDecisionIneligibilityReason: 'missing_reviewer_permission',
						viewerCanClose: false,
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

		it('shows no permission hint to a viewer who may still close the review', () => {
			const { getByTestId } = renderComponent({
				props: {
					review: makeDetail({
						viewerCanDecide: false,
						viewerDecisionIneligibilityReason: 'missing_permission',
						viewerCanClose: true,
					}),
					tab: 'activity',
					deciding: false,
				},
			});

			expect(getByTestId('workflow-review-decision-popover')).toHaveAttribute(
				'data-ineligibility-hint',
				'',
			);
		});
	});
});
