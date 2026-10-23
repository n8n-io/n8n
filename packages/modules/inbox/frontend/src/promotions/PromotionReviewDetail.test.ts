import type { InboxPromotionReviewItem } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
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

beforeEach(() => {
	vi.clearAllMocks();
	createTestingPinia();
	vi.mocked(useToast).mockReturnValue({ showError } as unknown as ReturnType<typeof useToast>);
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
