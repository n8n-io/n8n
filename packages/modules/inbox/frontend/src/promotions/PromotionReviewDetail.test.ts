import type { InboxPromotionReviewItem } from '@n8n/api-types';
import { componentRegistry, type PromotionChangesState } from '@n8n/frontend-module-sdk';
import { useToast } from '@n8n/composables/useToast';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { defineComponent } from 'vue';
import { onTestFinished } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import PromotionReviewDetail from './PromotionReviewDetail.vue';
import { approvePromotionReview } from './promotionReviews.api';

vi.mock('./promotionReviews.api');
vi.mock('@n8n/composables/useToast', () => ({ useToast: vi.fn() }));

const headCommitSha = 'a'.repeat(40);

const item = (props: Partial<InboxPromotionReviewItem> = {}): InboxPromotionReviewItem => ({
	type: 'promotion_review',
	id: 'rev-1',
	state: 'open',
	reviewState: 'open',
	reviewType: 'gitlab',
	title: 'Promote the thing',
	webUrl: 'https://gitlab.example.com/platform/workflows/-/merge_requests/1',
	branchName: 'n8n-promotion/1',
	environmentName: 'To production',
	requester: { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
	approver: null,
	remoteError: null,
	headCommitSha,
	runCommitSha: 'c'.repeat(40),
	hasConflicts: false,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...props,
});

const renderComponent = createComponentRenderer(PromotionReviewDetail);

const showError = vi.fn();
const onItemChange = vi.fn();

/** What the Changes tab reports. The editor renders it, so the test uses a stub. */
let shownChanges: PromotionChangesState;
const ChangesStub = defineComponent({
	props: { reviewId: { type: String, required: true } },
	emits: ['state'],
	mounted() {
		this.$emit('state', shownChanges);
	},
	template: '<div data-test-id="promotion-changes-stub">{{ reviewId }}</div>',
});

beforeEach(() => {
	vi.clearAllMocks();
	createTestingPinia();
	vi.mocked(useToast).mockReturnValue({ showError } as unknown as ReturnType<typeof useToast>);
	shownChanges = { status: 'ready', headCommitSha };
	componentRegistry.register('promotion-changes', ChangesStub);
	onTestFinished(() => componentRegistry.unregister('promotion-changes'));
});

async function approveInDialog({ getByRole, getByTestId }: ReturnType<typeof renderComponent>) {
	await userEvent.click(getByTestId('inbox-promotion-review-approve'));
	await userEvent.click(
		within(getByRole('dialog')).getByRole('button', { name: 'Approve and merge' }),
	);
}

it('shows the title, state, target, requester, and the link to GitLab', () => {
	const { getByRole, getByText, queryByText } = renderComponent({
		props: { item: item(), onItemChange },
	});

	expect(getByRole('heading', { name: 'Promote the thing' })).toBeInTheDocument();
	expect(getByText('Open')).toBeInTheDocument();
	expect(getByRole('link', { name: 'Open in GitLab' })).toHaveAttribute(
		'href',
		'https://gitlab.example.com/platform/workflows/-/merge_requests/1',
	);
	expect(getByText('To production')).toBeInTheDocument();
	expect(getByText('Ada Lovelace')).toBeInTheDocument();
	expect(queryByText('Reviewer')).not.toBeInTheDocument();
});

it('falls back to the branch name, explains why GitLab did not answer, and shows the approver', () => {
	const { getByRole, getByTestId, getByText, queryByRole, queryByTestId } = renderComponent({
		props: {
			item: item({
				state: 'closed',
				reviewState: 'merged',
				title: null,
				webUrl: null,
				remoteError: 'not_found',
				approver: { id: 'u2', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
			}),
			onItemChange,
		},
	});

	expect(getByRole('heading', { name: 'n8n-promotion/1' })).toBeInTheDocument();
	expect(getByTestId('inbox-promotion-review-remote-error')).toHaveTextContent(
		"GitLab can't find this merge request.",
	);
	expect(queryByRole('link', { name: 'Open in GitLab' })).not.toBeInTheDocument();
	expect(getByText('Merged')).toBeInTheDocument();
	expect(getByText('Grace Hopper')).toBeInTheDocument();
	expect(queryByTestId('inbox-promotion-review-approve')).not.toBeInTheDocument();
});

it('approves the review the admin confirmed, and locks the dialog until GitLab answers', async () => {
	const merged = createDeferredPromise<InboxPromotionReviewItem>();
	vi.mocked(approvePromotionReview).mockReturnValue(merged.promise);
	const { getByRole, getByTestId, queryByTestId, rerender } = renderComponent({
		props: { item: item(), onItemChange },
	});
	const dialogButton = (name: string) => within(getByRole('dialog')).getByRole('button', { name });
	expect(queryByTestId('inbox-promotion-review-approve-reason')).not.toBeInTheDocument();

	await userEvent.click(getByTestId('inbox-promotion-review-approve'));
	await userEvent.click(dialogButton('Cancel'));
	expect(approvePromotionReview).not.toHaveBeenCalled();

	await userEvent.click(getByTestId('inbox-promotion-review-approve'));
	await rerender({ item: item({ id: 'rev-2', headCommitSha: 'b'.repeat(40) }), onItemChange });
	await userEvent.click(dialogButton('Approve and merge'));

	expect(approvePromotionReview).toHaveBeenCalledWith(expect.anything(), 'rev-1', {
		headCommitSha,
	});
	expect(dialogButton('Cancel')).toBeDisabled();

	merged.resolve(
		item({ state: 'closed', reviewState: 'merged', updatedAt: '2026-01-02T00:00:00.000Z' }),
	);
	await waitFor(() =>
		expect(onItemChange).toHaveBeenCalledWith({
			type: 'promotion_review',
			id: 'rev-1',
			state: 'closed',
			updatedAt: '2026-01-02T00:00:00.000Z',
		}),
	);
});

it.each([
	[
		'a reviewer requested changes',
		{ reviewState: 'changes_requested' as const },
		'A reviewer requested changes. Resolve them on GitLab, then reload the Inbox.',
	],
	[
		'the merge request has conflicts',
		{ hasConflicts: true },
		'The merge request has conflicts. Resolve them on GitLab.',
	],
	[
		'GitLab did not answer',
		{ remoteError: 'unreachable' as const, headCommitSha: null },
		'GitLab unreachable',
	],
	[
		'GitLab did not report the head commit',
		{ headCommitSha: null },
		"GitLab didn't report the latest commit of this merge request. Reload the Inbox and try again.",
	],
])('disables approve with the reason when %s', (_case, props, reason) => {
	const { getByTestId } = renderComponent({ props: { item: item(props), onItemChange } });

	const button = getByTestId('inbox-promotion-review-approve');
	const text = getByTestId('inbox-promotion-review-approve-reason');
	expect(button).toBeDisabled();
	expect(text).toHaveTextContent(reason);
	expect(button).toHaveAttribute('aria-describedby', text.id);
});

it('shows the error, reloads the list, and enables approve again when the approval fails', async () => {
	const error = new Error('GitLab: 405 refused');
	vi.mocked(approvePromotionReview).mockRejectedValue(error);
	const rendered = renderComponent({ props: { item: item(), onItemChange } });

	await approveInDialog(rendered);

	expect(showError).toHaveBeenCalledWith(error, "Couldn't approve and merge");
	expect(onItemChange).toHaveBeenCalledWith({ type: 'promotion_review', id: 'rev-1' });
	expect(rendered.getByTestId('inbox-promotion-review-approve')).toBeEnabled();
});

it('shows the changes of the review from the shell', () => {
	const { getByRole, getByTestId } = renderComponent({ props: { item: item(), onItemChange } });

	expect(getByRole('tab', { name: 'Changes' })).toBeInTheDocument();
	expect(getByTestId('promotion-changes-stub')).toHaveTextContent('rev-1');
});

it('shows how a review without its environment ended, instead of loading its changes', () => {
	const { getByTestId, queryByTestId } = renderComponent({
		props: {
			item: item({ state: 'closed', reviewState: 'closed', remoteError: 'no_connection' }),
			onItemChange,
		},
	});

	const ended = getByTestId('inbox-promotion-review-without-environment');
	expect(ended).toHaveTextContent('This review is now closed');
	expect(ended).toHaveTextContent(
		"The environment of this review was deleted or no longer uses GitLab, so n8n can't show its changes.",
	);
	expect(queryByTestId('inbox-promotion-review-remote-error')).not.toBeInTheDocument();
	expect(queryByTestId('promotion-changes-stub')).not.toBeInTheDocument();
});

it.each([
	['the changes still load', { status: 'loading' } as const, null],
	[
		'the changes could not be shown',
		{ status: 'unavailable' } as const,
		"n8n couldn't show the changes of this review. Review and merge it on GitLab.",
	],
])('only approves changes that the admin saw: disabled when %s', async (_case, state, reason) => {
	shownChanges = state;

	const { getByTestId, findByTestId, queryByTestId } = renderComponent({
		props: { item: item(), onItemChange },
	});

	if (reason) {
		expect(await findByTestId('inbox-promotion-review-approve-reason')).toHaveTextContent(reason);
	} else {
		expect(queryByTestId('inbox-promotion-review-approve-reason')).not.toBeInTheDocument();
	}
	expect(getByTestId('inbox-promotion-review-approve')).toBeDisabled();
});

it('reloads the changes when GitLab reports new commits, then approves the new head', async () => {
	const newHead = 'b'.repeat(40);
	const rendered = renderComponent({
		props: { item: item({ headCommitSha: newHead }), onItemChange },
	});
	const { getByTestId, findByTestId, getByText } = rendered;

	expect(await findByTestId('inbox-promotion-review-new-commits')).toBeInTheDocument();
	const approve = getByTestId('inbox-promotion-review-approve');
	expect(approve).toBeDisabled();
	// The callout above the changes explains why.
	expect(approve).toHaveAttribute(
		'aria-describedby',
		getByText('The merge request has new commits since these changes loaded.').id,
	);

	shownChanges = { status: 'ready', headCommitSha: newHead };
	await userEvent.click(getByTestId('inbox-promotion-review-reload-changes'));
	await approveInDialog(rendered);

	expect(approvePromotionReview).toHaveBeenCalledWith(expect.anything(), 'rev-1', {
		headCommitSha: newHead,
	});
});
