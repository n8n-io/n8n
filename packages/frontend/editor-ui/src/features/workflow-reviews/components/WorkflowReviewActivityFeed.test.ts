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

	it('shows one entry per activity in the feed', async () => {
		store.entries = Array.from({ length: 3 }, (_, index) => makeEntry({ id: String(index) }));

		const { queryAllByTestId } = renderComponent();
		await nextTick();

		expect(queryAllByTestId('workflow-review-activity-entry')).toHaveLength(3);
	});

	it('shows a loading state while the first page is in flight', () => {
		store.loading = true;

		const { container, queryByTestId } = renderComponent();

		expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
		expect(queryByTestId('workflow-review-activity-empty')).not.toBeInTheDocument();
	});

	it('tells the viewer there is no activity yet', () => {
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

	it('reloads the feed when the viewer retries after a failure', () => {
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

	it('shows a placeholder for an activity type this frontend does not know', async () => {
		store.entries = [makeEntry({ typeVersion: 2 })];

		const { getByTestId } = renderComponent();
		await nextTick();

		expect(getByTestId('workflow-review-activity-unknown')).toHaveTextContent(
			"This activity entry can't be displayed.",
		);
	});

	it('loads older entries when the viewer scrolls to the top of the feed', async () => {
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

	it('stops loading once the oldest entry is on screen', async () => {
		store.entries = [makeEntry()];
		store.hasMore = false;

		renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).not.toHaveBeenCalled();
	});

	it('does not request the same older page twice', async () => {
		store.entries = [makeEntry()];
		store.hasMore = true;
		store.loadingMore = true;

		renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).not.toHaveBeenCalled();
	});
});
