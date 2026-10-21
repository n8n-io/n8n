import type { InboxPromotionReviewItem } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';

import PromotionReviewDetail from './PromotionReviewDetail.vue';

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
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...props,
});

const renderComponent = createComponentRenderer(PromotionReviewDetail);

it('shows the title, state, target, requester, and the link to GitLab', () => {
	const { getByRole, getByText, queryByText } = renderComponent({ props: { item: item() } });

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
	const { getByRole, getByTestId, getByText, queryByRole } = renderComponent({
		props: {
			item: item({
				reviewState: 'merged',
				title: null,
				webUrl: null,
				remoteError: 'not_found',
				approver: { id: 'u2', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
			}),
		},
	});

	expect(getByRole('heading', { name: 'n8n-promotion/1' })).toBeInTheDocument();
	expect(getByTestId('inbox-promotion-review-remote-error')).toHaveTextContent(
		"GitLab can't find this merge request.",
	);
	expect(queryByRole('link', { name: 'Open in GitLab' })).not.toBeInTheDocument();
	expect(getByText('Merged')).toBeInTheDocument();
	expect(getByText('Grace Hopper')).toBeInTheDocument();
});
