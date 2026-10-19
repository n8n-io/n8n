import type { PromotionReviewDetail as Detail } from '@n8n/api-types';
import { createComponentRenderer, waitAllPromises } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';

import PromotionReviewDetail from './PromotionReviewDetail.vue';
import { fetchPromotionReview } from './promotionReviews.api';

vi.mock('./promotionReviews.api');

const detail = (props: Partial<Detail> = {}): Detail => ({
	id: 'rev-1',
	state: 'open',
	remoteReviewId: '7!1',
	connection: { id: 'conn', name: 'Workflows' },
	config: { id: 'cfg', name: 'To production' },
	createdBy: { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
	approvedBy: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	approvedAt: null,
	lastStateChangeAt: null,
	remote: {
		title: 'Promote the thing',
		webUrl: 'https://gitlab.example.com/platform/workflows/-/merge_requests/1',
		hasConflicts: false,
	},
	remoteError: null,
	branchName: 'n8n-promotion/1',
	headCommitSha: 'b'.repeat(40),
	...props,
});

const renderComponent = createComponentRenderer(PromotionReviewDetail, {
	props: { reviewId: 'rev-1' },
});

beforeEach(() => {
	createTestingPinia();
	vi.clearAllMocks();
});

it('shows the title, state, target, requester, and the link to GitLab', async () => {
	vi.mocked(fetchPromotionReview).mockResolvedValue(detail());

	const { getByRole, getByText, queryByText } = renderComponent();
	await waitAllPromises();

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

it('falls back to the branch name, explains why GitLab did not answer, and shows the approver', async () => {
	vi.mocked(fetchPromotionReview).mockResolvedValue(
		detail({
			state: 'merged',
			remote: null,
			headCommitSha: null,
			remoteError: 'not_found',
			approvedBy: { id: 'u2', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
		}),
	);

	const { getByRole, getByTestId, getByText, queryByRole } = renderComponent();
	await waitAllPromises();

	expect(getByRole('heading', { name: 'n8n-promotion/1' })).toBeInTheDocument();
	expect(getByTestId('inbox-promotion-review-remote-error')).toHaveTextContent(
		"GitLab can't find this merge request.",
	);
	expect(queryByRole('link', { name: 'Open in GitLab' })).not.toBeInTheDocument();
	expect(getByText('Merged')).toBeInTheDocument();
	expect(getByText('Grace Hopper')).toBeInTheDocument();
});

it('shows an error when the review cannot load', async () => {
	vi.mocked(fetchPromotionReview).mockRejectedValue(new Error('403'));

	const { getByText } = renderComponent();
	await waitAllPromises();

	expect(getByText("Couldn't load this promotion review")).toBeInTheDocument();
});
