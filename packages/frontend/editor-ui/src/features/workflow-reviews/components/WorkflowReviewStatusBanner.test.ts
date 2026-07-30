import type { WorkflowReviewRequestForWorkflow } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { createPinia } from 'pinia';

import { createComponentRenderer } from '@/__tests__/render';
import WorkflowReviewStatusBanner from './WorkflowReviewStatusBanner.vue';

const PINNED_VERSION = 'aabbccdd-1111-2222-3333-444455556666';
const PINNED_LABEL = 'aabbccdd';

const review = (
	overrides: Partial<WorkflowReviewRequestForWorkflow> = {},
): WorkflowReviewRequestForWorkflow => ({
	id: 'req-1',
	state: 'open',
	decision: 'pending',
	workflowVersionId: PINNED_VERSION,
	createdAt: '2026-07-20T10:00:00.000Z',
	updatedAt: '2026-07-20T10:00:00.000Z',
	decisionBy: null,
	approvedVersionPublicationState: null,
	...overrides,
});

const actor = {
	id: 'user-2',
	email: 'reviewer@example.com',
	firstName: 'Rey',
	lastName: 'Viewer',
};

const renderComponent = createComponentRenderer(WorkflowReviewStatusBanner, {
	props: {
		review: review(),
		savedVersionId: PINNED_VERSION,
		canSubmitChanges: true,
		canRetryPublish: true,
		canOpenReview: true,
	},
});

const renderBanner = (props: Record<string, unknown> = {}) =>
	renderComponent({ pinia: createPinia(), props });

/** The popover content only mounts once the pill is clicked. */
const openPopover = async (props: Record<string, unknown> = {}) => {
	const result = renderBanner(props);
	await userEvent.click(result.getByTestId('workflow-review-status-pill'));
	return result;
};

describe('WorkflowReviewStatusBanner', () => {
	describe('state matrix', () => {
		it.each([
			{
				name: 'pending review pinned to the saved version',
				props: { review: review(), savedVersionId: PINNED_VERSION },
				pill: 'Waiting for review',
				title: 'Waiting for review',
				body: `Version ${PINNED_LABEL} is waiting for review.`,
				support: 'You can keep editing while the review is open.',
				// The review already covers the saved version, so no action is offered
				secondaryAction: null,
				secondaryEnabled: false,
			},
			{
				name: 'pending review pinned to an older version',
				props: { review: review(), savedVersionId: 'newer-version' },
				pill: 'Update review',
				title: 'Update review',
				body: 'This workflow has an open review that does not include your latest changes.',
				support: 'Submit the latest version to update the review.',
				secondaryAction: 'workflow-review-submit-changes-button',
				secondaryEnabled: true,
			},
			{
				name: 'changes requested on the saved version',
				props: {
					review: review({ decision: 'changes_requested', decisionBy: actor }),
					savedVersionId: PINNED_VERSION,
				},
				pill: 'Changes requested',
				title: 'Changes requested',
				body: `Rey Viewer requested changes on version ${PINNED_LABEL}.`,
				support:
					'Make your edits on this canvas, then submit the latest changes back to the review.',
				secondaryAction: 'workflow-review-submit-changes-button',
				secondaryEnabled: false,
			},
			{
				name: 'changes requested on an older version',
				props: {
					review: review({ decision: 'changes_requested', decisionBy: actor }),
					savedVersionId: 'newer-version',
				},
				pill: 'Changes requested',
				title: 'Changes requested',
				body: `Rey Viewer requested changes on version ${PINNED_LABEL}.`,
				support:
					'Make your edits on this canvas, then submit the latest changes back to the review.',
				secondaryAction: 'workflow-review-submit-changes-button',
				secondaryEnabled: true,
			},
			{
				name: 'changes requested without a resolvable actor',
				props: {
					review: review({ decision: 'changes_requested' }),
					savedVersionId: 'newer-version',
				},
				pill: 'Changes requested',
				title: 'Changes requested',
				body: `Changes were requested on version ${PINNED_LABEL}.`,
				support:
					'Make your edits on this canvas, then submit the latest changes back to the review.',
				secondaryAction: 'workflow-review-submit-changes-button',
				secondaryEnabled: true,
			},
			{
				name: 'approved version that was never published',
				props: {
					review: review({
						state: 'closed',
						decision: 'approved',
						approvedVersionPublicationState: 'not_published',
					}),
					savedVersionId: 'newer-version',
				},
				pill: 'Approved',
				title: 'Approved, not published',
				body: `Version ${PINNED_LABEL} was approved but hasn't been published.`,
				support: 'Retry publishing it, or open the review for details.',
				secondaryAction: 'workflow-review-retry-publish-button',
				secondaryEnabled: true,
			},
		])(
			'renders $name',
			async ({ props, pill, title, body, support, secondaryAction, secondaryEnabled }) => {
				const { getByTestId, queryByTestId } = await openPopover(props);

				expect(getByTestId('workflow-review-status-pill')).toHaveTextContent(pill);

				// Scoped to the popover: the pill label can repeat the popover title
				const popover = within(getByTestId('workflow-review-status-popover'));
				expect(popover.getByRole('heading', { name: title })).toBeInTheDocument();
				expect(popover.getByText(body)).toBeInTheDocument();
				expect(popover.getByText(support)).toBeInTheDocument();
				expect(getByTestId('workflow-review-open-review-button')).toBeEnabled();

				if (secondaryAction === null) {
					expect(queryByTestId('workflow-review-submit-changes-button')).not.toBeInTheDocument();
					expect(queryByTestId('workflow-review-retry-publish-button')).not.toBeInTheDocument();
					return;
				}

				const secondary = getByTestId(secondaryAction);
				if (secondaryEnabled) {
					expect(secondary).toBeEnabled();
				} else {
					expect(secondary).toBeDisabled();
				}
			},
		);

		it.each([
			{ name: 'no review at all', review: null },
			{
				name: 'an approved version that is already published',
				review: review({
					state: 'closed',
					decision: 'approved',
					approvedVersionPublicationState: 'published',
				}),
			},
			{
				name: 'an approved version superseded by a newer publish',
				review: review({
					state: 'closed',
					decision: 'approved',
					approvedVersionPublicationState: 'superseded',
				}),
			},
			{
				name: 'an approved version whose publication state is unknown',
				review: review({
					state: 'closed',
					decision: 'approved',
					approvedVersionPublicationState: 'unknown',
				}),
			},
			{ name: 'a closed review without approval', review: review({ state: 'closed' }) },
			{ name: 'a pruned pinned version', review: review({ workflowVersionId: null }) },
		])('renders nothing for $name', ({ review: latestReview }) => {
			const { queryByTestId } = renderBanner({ review: latestReview });

			expect(queryByTestId('workflow-review-status-pill')).not.toBeInTheDocument();
		});
	});

	describe('actions', () => {
		it('emits open-review and closes the popover', async () => {
			const { getByTestId, queryByTestId, emitted } = await openPopover();

			await userEvent.click(getByTestId('workflow-review-open-review-button'));

			expect(emitted('open-review')).toHaveLength(1);
			expect(queryByTestId('workflow-review-status-popover')).not.toBeInTheDocument();
		});

		it('emits submit-changes for a divergent saved version', async () => {
			const { getByTestId, emitted } = await openPopover({ savedVersionId: 'newer-version' });

			await userEvent.click(getByTestId('workflow-review-submit-changes-button'));

			expect(emitted('submit-changes')).toHaveLength(1);
		});

		it('keeps Submit changes disabled without permission, even for a divergent version', async () => {
			const { getByTestId } = await openPopover({
				savedVersionId: 'newer-version',
				canSubmitChanges: false,
			});

			expect(getByTestId('workflow-review-submit-changes-button')).toBeDisabled();
		});

		it('treats an unknown saved version as in sync', async () => {
			const { queryByTestId } = await openPopover({ savedVersionId: undefined });

			expect(queryByTestId('workflow-review-submit-changes-button')).not.toBeInTheDocument();
		});

		// R2 (P3): the changes-requested copy tells the author to submit, so the
		// disabled button has to say what unblocks it — see LIGO-607_review.md
		it('explains why Submit changes is disabled while in sync', async () => {
			const { getByTestId, findByText } = await openPopover({
				review: review({ decision: 'changes_requested', decisionBy: actor }),
				savedVersionId: PINNED_VERSION,
			});

			await userEvent.hover(getByTestId('workflow-review-submit-changes-button'));

			expect(
				await findByText('Save your changes first to submit them to this review.'),
			).toBeInTheDocument();
		});

		// R3 (P3): the detail route 404s without publish rights — see LIGO-607_review.md
		it('hides Open review when the detail route is unreachable', async () => {
			const { queryByTestId, getByTestId } = await openPopover({ canOpenReview: false });

			expect(queryByTestId('workflow-review-open-review-button')).not.toBeInTheDocument();
			expect(getByTestId('workflow-review-status-popover')).toBeInTheDocument();
		});

		it('emits retry-publish for an approved version that was never published', async () => {
			const approved = review({
				state: 'closed',
				decision: 'approved',
				approvedVersionPublicationState: 'not_published',
			});
			const { getByTestId, emitted } = await openPopover({ review: approved });

			await userEvent.click(getByTestId('workflow-review-retry-publish-button'));

			expect(emitted('retry-publish')).toHaveLength(1);
		});

		it.each([
			{ name: 'the user cannot publish', props: { canRetryPublish: false } },
			{ name: 'a retry is in flight', props: { isPublishing: true } },
		])('disables Retry publish when $name', async ({ props }) => {
			const approved = review({
				state: 'closed',
				decision: 'approved',
				approvedVersionPublicationState: 'not_published',
			});
			const { getByTestId } = await openPopover({ review: approved, ...props });

			expect(getByTestId('workflow-review-retry-publish-button')).toBeDisabled();
		});
	});
});
