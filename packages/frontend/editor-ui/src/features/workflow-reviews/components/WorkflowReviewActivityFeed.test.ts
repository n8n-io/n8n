import type { WorkflowReviewActivityEntry } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { nextTick } from 'vue';

import { useReviewActivityStore } from '../reviewActivity.store';
import WorkflowReviewActivityFeed from './WorkflowReviewActivityFeed.vue';

/**
 * Scroll anchoring and the first-load scroll to bottom are deliberately untested:
 * jsdom has no layout, so `scrollHeight` is always 0 and `getBoundingClientRect()`
 * all zeroes. A test would have to stub those getters and then re-compute the
 * production arithmetic from its own constants. Do not backfill a fake one.
 */
const observer = vi.hoisted(() => ({
	observe: vi.fn(),
	onIntersect: () => {},
}));

vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: (options: { onIntersect: () => void }) => {
		observer.onIntersect = options.onIntersect;
		return { observe: observer.observe, disconnect: vi.fn(), observer: { value: null } };
	},
}));

const renderComponent = createComponentRenderer(WorkflowReviewActivityFeed);

function makeEntry(overrides: Partial<WorkflowReviewActivityEntry> = {}) {
	return {
		id: '1',
		type: 'comment.created',
		typeVersion: 1,
		data: null,
		createdBy: null,
		createdAt: '2024-01-01T00:00:00.000Z',
		messages: [
			{
				id: 'msg-1',
				body: 'Looks good',
				createdBy: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: null,
				deletedAt: null,
			},
		],
		...overrides,
	} as WorkflowReviewActivityEntry;
}

describe('WorkflowReviewActivityFeed', () => {
	let store: ReturnType<typeof mockedStore<typeof useReviewActivityStore>>;

	beforeEach(() => {
		createTestingPinia();
		observer.observe.mockReset();
		store = mockedStore(useReviewActivityStore);
		store.currentReviewId = 'req-1';
		store.entries = [];
		store.loading = false;
		store.loadingMore = false;
		store.hasMore = false;
		store.error = null;
	});

	it.each([0, 1, 3])('renders %i entries', async (count) => {
		store.entries = Array.from({ length: count }, (_, index) => makeEntry({ id: String(index) }));

		const { queryAllByTestId } = renderComponent();
		await nextTick();

		expect(queryAllByTestId('workflow-review-activity-entry')).toHaveLength(count);
	});

	it('shows a loading state while the first page is in flight', () => {
		store.loading = true;

		const { container, queryByTestId } = renderComponent();

		expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
		expect(queryByTestId('workflow-review-activity-empty')).not.toBeInTheDocument();
	});

	it('shows the empty state once settled with no entries', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('workflow-review-activity-empty')).toHaveTextContent('No activity yet');
	});

	it('shows an error row when the first page failed', () => {
		store.error = new Error('boom');

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('workflow-review-activity-error')).toHaveTextContent(
			'Could not load activity',
		);
		expect(queryByTestId('workflow-review-activity-empty')).not.toBeInTheDocument();
	});

	it('refetches the first page when the failed initial load is retried', () => {
		store.error = new Error('boom');

		const { getByTestId } = renderComponent();
		getByTestId('workflow-review-activity-retry').click();

		// `loadMore` is a no-op here: with no cursor it returns before requesting anything
		expect(store.fetchFeed).toHaveBeenCalledWith('req-1');
	});

	it('keeps a loaded feed and offers a retry when load-more failed', async () => {
		store.entries = [makeEntry()];
		store.hasMore = true;
		store.error = new Error('boom');

		const { getAllByTestId, getByTestId, queryByTestId } = renderComponent();
		await nextTick();

		expect(getAllByTestId('workflow-review-activity-entry')).toHaveLength(1);
		expect(queryByTestId('workflow-review-activity-error')).not.toBeInTheDocument();

		getByTestId('workflow-review-activity-load-more-retry').click();

		expect(store.loadMore).toHaveBeenCalled();

		// Paging must survive a failure: the sentinel is withheld while the error shows,
		// so it has to come back — and be observed again — once the error clears.
		observer.observe.mockClear();
		store.error = null;
		await nextTick();
		await nextTick();

		expect(observer.observe).toHaveBeenCalledWith(
			getByTestId('workflow-review-activity-load-more-sentinel'),
		);
	});

	it('renders the fallback for an entry version it does not know', async () => {
		store.entries = [makeEntry({ typeVersion: 2 })];

		const { getByTestId } = renderComponent();
		await nextTick();

		expect(getByTestId('workflow-review-activity-unknown')).toHaveTextContent(
			"This activity entry can't be displayed.",
		);
	});

	it('observes the sentinel and loads older entries when it intersects', async () => {
		store.entries = [makeEntry()];
		store.hasMore = true;

		const { getByTestId } = renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).toHaveBeenCalledWith(
			getByTestId('workflow-review-activity-load-more-sentinel'),
		);

		observer.onIntersect();

		expect(store.loadMore).toHaveBeenCalledTimes(1);
	});

	it('does not observe when there is nothing older to load', async () => {
		store.entries = [makeEntry()];
		store.hasMore = false;

		renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).not.toHaveBeenCalled();
	});

	it('does not observe while a page is already loading', async () => {
		store.entries = [makeEntry()];
		store.hasMore = true;
		store.loadingMore = true;

		renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).not.toHaveBeenCalled();
	});
});
