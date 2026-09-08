import type { WorkflowReviewInboxItem } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { LOCAL_STORAGE_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS } from '@/app/constants/localStorage';
import { useUsersStore } from '@n8n/stores/users.store';
import WorkflowReviewRequestsSidebar from './WorkflowReviewRequestsSidebar.vue';
import type { ReviewInboxSidebarSection } from './WorkflowReviewRequestsSidebar.vue';

const observe = vi.fn();
vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({
		observe: (...args: unknown[]) => observe(...args),
		disconnect: vi.fn(),
		observer: { value: null },
	}),
}));

const renderComponent = createComponentRenderer(WorkflowReviewRequestsSidebar);

const CURRENT_USER_ID = 'current-user';

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

function makeItem(overrides: Partial<WorkflowReviewInboxItem> = {}): WorkflowReviewInboxItem {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Needs review',
		workflowName: 'My workflow',
		requester: null,
		authors: [],
		reviewers: reviewers.slice(0, 1),
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
		workflowVersionId: overrides.workflowVersionId ?? null,
	};
}

function makeSection(
	key: ReviewInboxSidebarSection['key'],
	overrides: Partial<ReviewInboxSidebarSection> = {},
): ReviewInboxSidebarSection {
	return {
		key,
		items: [],
		loadingMore: false,
		hasMore: false,
		error: null,
		...overrides,
	};
}

function openProps(overrides: Partial<ReviewInboxSidebarSection>[] = [{}, {}]) {
	return {
		sections: [makeSection('waiting', overrides[0]), makeSection('authored', overrides[1])],
		loading: false,
		initialLoadFailed: false,
		activeTab: 'open' as const,
		openCount: 1,
		closedCount: 0,
		selectedId: null,
	};
}

function closedProps(overrides: Partial<ReviewInboxSidebarSection> = {}) {
	return {
		sections: [makeSection('closed', overrides)],
		loading: false,
		initialLoadFailed: false,
		activeTab: 'closed' as const,
		openCount: 0,
		closedCount: 1,
		selectedId: null,
	};
}

describe('WorkflowReviewRequestsSidebar', () => {
	beforeEach(() => {
		localStorage.clear();
		observe.mockClear();
		createTestingPinia();
		const usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = {
			id: CURRENT_USER_ID,
			email: 'me@example.com',
			firstName: 'Me',
			lastName: 'User',
		} as never;
		usersStore.currentUserId = CURRENT_USER_ID;
	});

	describe('cards', () => {
		it.each([
			{ state: 'open' as const, decision: 'pending' as const, label: 'Open | Waiting for review' },
			{
				state: 'open' as const,
				decision: 'changes_requested' as const,
				label: 'Open | Changes requested',
			},
			{ state: 'closed' as const, decision: 'approved' as const, label: 'Closed | Approved' },
			{ state: 'closed' as const, decision: 'pending' as const, label: 'Closed | No decision' },
		])('maps $state + $decision to the "$label" status indicator', ({ state, decision, label }) => {
			const props =
				state === 'closed'
					? closedProps({ items: [makeItem({ state, decision })] })
					: openProps([{ items: [makeItem({ state, decision })] }, {}]);
			const { getByTestId } = renderComponent({ props });

			expect(getByTestId('workflow-review-request-status-dot')).toHaveAttribute(
				'aria-label',
				label,
			);
		});
	});

	describe('sections', () => {
		it('renders both open headers in order, waiting before authored', () => {
			const { getAllByTestId } = renderComponent({
				props: openProps([{ items: [makeItem()] }, { items: [makeItem({ id: 'req-2' })] }]),
			});

			const headers = getAllByTestId('workflow-review-section-header');
			expect(headers.map((header) => header.dataset.section)).toEqual(['waiting', 'authored']);
			expect(headers[0]).toHaveTextContent('Waiting for your review');
			expect(headers[1]).toHaveTextContent('Authored by you');
		});

		it('drops a settled empty section, keeping the populated sibling', () => {
			const { getAllByTestId } = renderComponent({
				props: openProps([{ items: [makeItem()] }, {}]),
			});

			const headers = getAllByTestId('workflow-review-section-header');
			expect(headers.map((header) => header.dataset.section)).toEqual(['waiting']);
			expect(getAllByTestId('workflow-review-request-row')).toHaveLength(1);
		});

		it('drops every section when the whole tab is empty', () => {
			const { queryAllByTestId } = renderComponent({ props: openProps() });

			expect(queryAllByTestId('workflow-review-section-header')).toHaveLength(0);
			expect(queryAllByTestId('workflow-review-request-row')).toHaveLength(0);
		});

		it('renders no header on the closed tab', () => {
			const { queryAllByTestId, getAllByTestId } = renderComponent({
				props: closedProps({ items: [makeItem({ state: 'closed' })] }),
			});

			expect(queryAllByTestId('workflow-review-section-header')).toHaveLength(0);
			expect(getAllByTestId('workflow-review-request-row')).toHaveLength(1);
		});

		it('gives each section its own labelled listbox holding only options', () => {
			const { container } = renderComponent({
				props: openProps([{ items: [makeItem()] }, { items: [makeItem({ id: 'req-2' })] }]),
			});

			const listboxes = container.querySelectorAll('[role="listbox"]');
			expect(listboxes).toHaveLength(2);
			expect(listboxes[0].getAttribute('aria-labelledby')).toBe(
				'workflow-review-section-header-waiting',
			);
			expect(listboxes[0].querySelectorAll('[role="option"]')).toHaveLength(1);
			expect(listboxes[0].querySelector('button')).toBeNull();
		});

		it('keeps the section headers and controls outside any listbox', () => {
			const { getAllByTestId } = renderComponent({
				props: openProps([{ error: new Error('nope'), hasMore: true }, {}]),
			});

			for (const testId of [
				'workflow-review-section-header',
				'workflow-review-section-retry',
				'workflow-review-section-load-more',
			]) {
				for (const element of getAllByTestId(testId)) {
					expect(element.closest('[role="listbox"]')).toBeNull();
				}
			}
		});

		// The member wording is already covered by the header-order test above.
		it('drops the possessive waiting labels for an admin', () => {
			mockedStore(useUsersStore).isAdminOrOwner = true;

			const { getAllByTestId } = renderComponent({
				props: openProps([{ items: [makeItem()] }, {}]),
			});

			expect(getAllByTestId('workflow-review-section-header')[0]).toHaveTextContent(
				'Waiting for review',
			);
		});

		it('shows one skeleton and no headers while the active tab loads', () => {
			const { getAllByTestId, queryAllByTestId } = renderComponent({
				props: { ...openProps(), loading: true },
			});

			expect(getAllByTestId('workflow-review-list-skeleton')).toHaveLength(1);
			expect(queryAllByTestId('workflow-review-section-header')).toHaveLength(0);
		});

		it('renders the tabs without counts while the summary is unavailable', () => {
			const { getByTestId } = renderComponent({
				props: { ...openProps(), openCount: null, closedCount: null },
			});

			const tabs = getByTestId('workflow-reviews-tabs');
			expect(tabs).toHaveTextContent('Open');
			expect(tabs.querySelectorAll('.n8n-tag')).toHaveLength(0);
		});

		it('keeps the whole-list skeleton while either open section is loading', () => {
			const { getAllByTestId, queryAllByTestId } = renderComponent({
				props: {
					...openProps([{}, { items: [makeItem({ id: 'authored-1' })] }]),
					loading: true,
				},
			});

			expect(getAllByTestId('workflow-review-list-skeleton')).toHaveLength(1);
			expect(queryAllByTestId('workflow-review-section-header')).toHaveLength(0);
		});
	});

	describe('collapsing', () => {
		it('hides rows, flips aria-expanded, and persists the choice', async () => {
			const { getAllByTestId, queryAllByTestId } = renderComponent({
				props: openProps([{ items: [makeItem()] }, {}]),
			});

			const [waitingHeader] = getAllByTestId('workflow-review-section-header');
			expect(waitingHeader).toHaveAttribute('aria-expanded', 'true');
			expect(waitingHeader).toHaveAttribute(
				'aria-controls',
				'workflow-review-section-group-waiting',
			);

			await fireEvent.click(waitingHeader);

			expect(waitingHeader).toHaveAttribute('aria-expanded', 'false');
			expect(queryAllByTestId('workflow-review-request-row')).toHaveLength(0);
			await nextTick();
			expect(
				localStorage.getItem(
					LOCAL_STORAGE_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS(CURRENT_USER_ID),
				),
			).toContain('"waiting":true');
		});

		it('starts collapsed from persisted state and re-expands without refetching', async () => {
			localStorage.setItem(
				LOCAL_STORAGE_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS(CURRENT_USER_ID),
				JSON.stringify({ waiting: true, authored: false }),
			);

			const { getAllByTestId, queryAllByTestId, emitted } = renderComponent({
				props: openProps([{ items: [makeItem()] }, {}]),
			});

			expect(queryAllByTestId('workflow-review-request-row')).toHaveLength(0);

			await fireEvent.click(getAllByTestId('workflow-review-section-header')[0]);

			expect(queryAllByTestId('workflow-review-request-row')).toHaveLength(1);
			expect(emitted().loadMore).toBeUndefined();
		});
	});

	describe('load more', () => {
		it('renders the button only for the section that has more, and emits its key', async () => {
			const { getAllByTestId, emitted } = renderComponent({
				props: openProps([
					{ items: [makeItem()] },
					{ items: [makeItem({ id: 'req-2' })], hasMore: true },
				]),
			});

			const buttons = getAllByTestId('workflow-review-section-load-more');
			expect(buttons).toHaveLength(1);
			expect(buttons[0].dataset.section).toBe('authored');

			await fireEvent.click(buttons[0]);

			expect(emitted().loadMore).toEqual([['authored']]);
		});

		it('keeps the sentinel instead of a button on the closed tab', async () => {
			const { queryAllByTestId } = renderComponent({
				props: closedProps({ items: [makeItem({ state: 'closed' })], hasMore: true }),
			});
			await nextTick();

			expect(queryAllByTestId('workflow-review-section-load-more')).toHaveLength(0);
			expect(observe).toHaveBeenCalled();
		});

		it('does not observe a sentinel on the open tab', async () => {
			renderComponent({
				props: openProps([{ items: [makeItem()], hasMore: true }, {}]),
			});
			await nextTick();

			expect(observe).not.toHaveBeenCalled();
		});
	});

	describe('errors', () => {
		it('shows one retry when an initial failure leaves no usable rows', async () => {
			const { getByTestId, queryAllByTestId, emitted } = renderComponent({
				props: {
					...openProps([{ error: new Error('boom') }, {}]),
					initialLoadFailed: true,
				},
			});

			expect(getByTestId('workflow-review-list-error')).toHaveTextContent("Couldn't load reviews");
			expect(queryAllByTestId('workflow-review-request-row')).toHaveLength(0);

			await fireEvent.click(getByTestId('workflow-review-list-retry'));

			expect(emitted().retryActiveTab).toEqual([[]]);
		});

		it('shows a healthy sibling and gives the failed section its own retry', async () => {
			const { getByTestId, getAllByTestId, queryByTestId, emitted } = renderComponent({
				props: {
					...openProps([{ error: new Error('boom') }, { items: [makeItem()] }]),
					initialLoadFailed: true,
				},
			});

			expect(queryByTestId('workflow-review-list-error')).not.toBeInTheDocument();
			expect(getAllByTestId('workflow-review-request-row')).toHaveLength(1);
			expect(getByTestId('workflow-review-section-error').dataset.section).toBe('waiting');

			await fireEvent.click(getByTestId('workflow-review-section-retry'));

			expect(emitted().retry).toEqual([['waiting']]);
		});

		it('keeps loaded rows and the sibling section visible and emits retry for that section', async () => {
			const { getByTestId, getAllByTestId, emitted } = renderComponent({
				props: openProps([
					{ items: [makeItem()], error: new Error('boom') },
					{ items: [makeItem({ id: 'req-2' })] },
				]),
			});

			expect(getAllByTestId('workflow-review-request-row')).toHaveLength(2);
			expect(getByTestId('workflow-review-section-error').dataset.section).toBe('waiting');

			await fireEvent.click(getByTestId('workflow-review-section-retry'));

			expect(emitted().retry).toEqual([['waiting']]);
		});
	});
});
