import type { WorkflowReviewInboxItem } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUsersStore } from '@n8n/stores/users.store';
import WorkflowReviewRequestsSidebar from './WorkflowReviewRequestsSidebar.vue';

vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({
		observe: vi.fn(),
		disconnect: vi.fn(),
		observer: { value: null },
	}),
}));

const renderComponent = createComponentRenderer(WorkflowReviewRequestsSidebar);

const requester = {
	id: 'user-requester',
	email: 'requester@example.com',
	firstName: 'Rita',
	lastName: 'Requester',
};

const reviewers = [
	{
		id: 'user-reviewer-1',
		email: 'reviewer1@example.com',
		firstName: 'Rey',
		lastName: 'One',
	},
	{
		id: 'user-reviewer-2',
		email: 'reviewer2@example.com',
		firstName: 'Reba',
		lastName: 'Two',
	},
	{
		id: 'user-reviewer-3',
		email: 'reviewer3@example.com',
		firstName: 'Ron',
		lastName: 'Three',
	},
];

const laterAuthor = {
	id: 'user-author',
	email: 'author@example.com',
	firstName: 'Ada',
	lastName: 'Author',
};

function makeItem(overrides: Partial<WorkflowReviewInboxItem> = {}): WorkflowReviewInboxItem {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Needs review',
		workflowName: 'My workflow',
		requester,
		// The backend always carries the requester in `authors` too.
		authors: [{ ...requester }, laterAuthor],
		reviewers: reviewers.slice(0, 1),
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
		workflowVersionId: overrides.workflowVersionId ?? null,
	};
}

const baseProps = {
	activeTab: 'open' as const,
	openCount: 1,
	closedCount: 0,
	selectedId: null,
	loading: false,
	loadingMore: false,
	hasMore: false,
	isEmpty: false,
};

describe('WorkflowReviewRequestsSidebar', () => {
	beforeEach(() => {
		createTestingPinia();
		const usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = {
			id: 'current-user',
			email: 'me@example.com',
			firstName: 'Me',
			lastName: 'User',
		} as never;
	});

	function avatarIds(container: Element) {
		return [...container.querySelectorAll('[data-test-id^="user-stack-avatar-"]')].map((avatar) =>
			avatar.getAttribute('data-test-id')?.replace('user-stack-avatar-', ''),
		);
	}

	it('orders participants requester first, then reviewers, then remaining authors', () => {
		const { getByTestId, container } = renderComponent({
			props: {
				...baseProps,
				items: [makeItem()],
			},
		});

		expect(getByTestId('workflow-review-request-users')).toBeInTheDocument();
		expect(avatarIds(container)).toEqual([requester.id, reviewers[0].id, laterAuthor.id]);
	});

	it('shows each participant once even when they hold several roles', () => {
		const { container } = renderComponent({
			props: {
				...baseProps,
				items: [
					makeItem({
						reviewers: [reviewers[0]],
						// Separate object instances: deduplication must go by id, not identity.
						authors: [{ ...requester }, { ...reviewers[0] }, laterAuthor],
					}),
				],
			},
		});

		// The reviewer-author keeps the reviewer slot, ahead of the co-author.
		expect(avatarIds(container)).toEqual([requester.id, reviewers[0].id, laterAuthor.id]);
	});

	it('lists every participant once and without role headings in the popover', async () => {
		const { getByTestId, findByTestId, findAllByTestId } = renderComponent({
			props: {
				...baseProps,
				items: [makeItem()],
			},
		});

		await userEvent.hover(getByTestId('user-stack-avatars'));
		const list = await findByTestId('user-stack-list');

		for (const { id } of [requester, reviewers[0], laterAuthor]) {
			expect(await findAllByTestId(`user-stack-info-${id}`)).toHaveLength(1);
		}
		// A single group renders no heading — role labels are the detail view's job.
		expect(list.querySelector('[class*="groupName"]')).toBeNull();
	});

	it('counts deduplicated participants in the overflow badge', () => {
		const { getByTestId, container } = renderComponent({
			props: {
				...baseProps,
				items: [makeItem({ reviewers, authors: [{ ...requester }, laterAuthor] })],
			},
		});

		// Requester + 3 reviewers + 1 later author = 5 participants; maxAvatars is 3, so +2.
		expect(getByTestId('workflow-review-request-users')).toBeInTheDocument();
		expect(avatarIds(container)).toHaveLength(3);
		expect(container.querySelector('.hiddenBadge')).toHaveTextContent('+2');
	});

	it('keeps the user stack visible when only authors remain', () => {
		const { getByTestId, container } = renderComponent({
			props: {
				...baseProps,
				items: [makeItem({ requester: null, reviewers: [], authors: [laterAuthor] })],
			},
		});

		expect(getByTestId('workflow-review-request-users')).toBeInTheDocument();
		expect(avatarIds(container)).toEqual([laterAuthor.id]);
	});

	it('does not render the user stack when there are no nameable participants', () => {
		const { queryByTestId } = renderComponent({
			props: {
				...baseProps,
				items: [makeItem({ requester: null, reviewers: [], authors: [] })],
			},
		});

		expect(queryByTestId('workflow-review-request-users')).not.toBeInTheDocument();
	});

	it.each([
		{
			state: 'open' as const,
			decision: 'pending' as const,
			label: 'Waiting for review',
		},
		{
			state: 'open' as const,
			decision: 'changes_requested' as const,
			label: 'Changes requested',
		},
		{
			state: 'closed' as const,
			decision: 'approved' as const,
			label: 'Approved',
		},
		{
			state: 'closed' as const,
			decision: 'pending' as const,
			label: 'Closed',
		},
	])('maps $state + $decision to the "$label" status indicator', ({ state, decision, label }) => {
		const { getByTestId } = renderComponent({
			props: {
				...baseProps,
				activeTab: state,
				items: [makeItem({ state, decision })],
			},
		});

		expect(getByTestId('workflow-review-request-status-dot')).toHaveAttribute('aria-label', label);
	});
});
