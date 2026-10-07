import type { InboxSelfHealingItem, InboxWorkflowReviewItem } from '@n8n/api-types';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { defineComponent, type PropType } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { INBOX_VIEW, type InboxItemChange } from '../inbox.constants';
import { createInboxListSlice, useInboxStore } from '../inbox.store';
import InboxView from './InboxView.vue';

vi.mock('@n8n/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));
const refreshDetail = vi.fn();
const detailMounted = vi.fn();
let reportChange: (change: InboxItemChange) => void;
const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/inbox', name: INBOX_VIEW, component: { template: '<div />' } },
		{ path: '/:pathMatch(.*)*', name: 'not-found', component: { template: '<div />' } },
	],
});
const renderComponent = createComponentRenderer(InboxView, {
	global: {
		plugins: [router],
		stubs: {
			InboxList: {
				props: ['sections', 'activeTab'],
				template: `<div>
     <button data-test-id="load-authored" @click="$emit('loadMore', 'authored')" />
     <button data-test-id="refresh-waiting" @click="$emit('refreshSection', 'waiting')" />
     <button data-test-id="retry-waiting" @click="$emit('retry', 'waiting')" />
     <button data-test-id="select-review" @click="$emit('select', { type: 'workflow_review', id: 'req-1' })" />
     <button data-test-id="select-other-review" @click="$emit('select', { type: 'workflow_review', id: 'req-2' })" />
     <button data-test-id="select-result" @click="$emit('select', { type: 'self_healing_result', id: 'req-1', projectId: 'p1', workflowId: 'w1' })" />
     <button data-test-id="clear-review" @click="$emit('clear')" />
     <button data-test-id="select-closed-tab" @click="$emit('update:active-tab', 'closed')" />
    </div>`,
			},
			WorkflowReviewDetail: defineComponent({
				props: {
					reviewId: { type: String, required: true },
					listItem: { type: Object as PropType<InboxWorkflowReviewItem> },
					tab: String,
					onItemChange: {
						type: Function as PropType<(change: InboxItemChange) => void>,
						required: true,
					},
				},
				emits: ['update:tab'],
				setup(props, { expose }) {
					detailMounted(props.reviewId);
					reportChange = props.onItemChange;
					expose({ refresh: refreshDetail });
				},
				template: `<div data-test-id="review-detail" :data-id="reviewId" :data-tab="tab" :data-title="listItem?.title">
     <button data-test-id="select-changes-tab" @click="$emit('update:tab', 'changes')" />
     <button data-test-id="select-activity-tab" @click="$emit('update:tab', 'activity')" />
    </div>`,
			}),
			SelfHealingResultDetail: {
				props: ['selection'],
				template: '<div data-test-id="result-detail" :data-id="selection.id" />',
			},
		},
	},
});

let store: ReturnType<typeof mockedStore<typeof useInboxStore>>;
beforeEach(async () => {
	createTestingPinia();
	vi.clearAllMocks();
	await router.replace('/inbox');
	await router.isReady();
	mockedStore(useSettingsStore).settings.inbox = {
		enabled: true,
		availableTypes: ['workflow_review', 'self_healing_result'],
		failedTypes: [],
	};
	store = mockedStore(useInboxStore);
	store.refreshListAndSummary.mockResolvedValue(undefined);
	store.fetchSummary.mockResolvedValue(undefined);
	store.setActiveTab.mockResolvedValue(undefined);
	refreshDetail.mockResolvedValue(undefined);
});

it('refreshes the list and summary on mount', async () => {
	renderComponent();
	await waitAllPromises();
	expect(store.refreshListAndSummary).toHaveBeenCalledTimes(1);
	expect(detailMounted).not.toHaveBeenCalled();
});

it('passes the selected review and list fallback to its detail entry', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	store.lists.waiting.items = [reviewItem()];
	const { getByTestId } = renderComponent();
	expect(getByTestId('review-detail')).toHaveAttribute('data-id', 'req-1');
	expect(getByTestId('review-detail')).toHaveAttribute('data-title', 'List review');
});

it('selects a result with the same ID without rendering the review entry', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	const { getByTestId, queryByTestId } = renderComponent();
	getByTestId('select-result').click();
	await waitAllPromises();
	expect(router.currentRoute.value.query).toEqual({
		type: 'self_healing_result',
		itemId: 'req-1',
		projectId: 'p1',
		workflowId: 'w1',
	});
	expect(getByTestId('result-detail')).toHaveAttribute('data-id', 'req-1');
	expect(queryByTestId('review-detail')).not.toBeInTheDocument();
});

it('clears all selection fields and keeps the current state', async () => {
	await router.replace(
		'/inbox?type=self_healing_result&itemId=r1&projectId=p1&workflowId=w1&state=closed',
	);
	const { getByTestId } = renderComponent();
	getByTestId('clear-review').click();
	await waitAllPromises();
	expect(router.currentRoute.value.fullPath).toBe('/inbox?state=closed');
});

it('clears a disabled-source deep link without mounting its detail entry', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	store.disabledSources = ['workflow_review'];
	renderComponent();
	await waitAllPromises();
	expect(router.currentRoute.value.fullPath).toBe('/inbox');
	expect(detailMounted).not.toHaveBeenCalled();
});

it('unmounts the selected detail when its source becomes disabled', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	const { queryByTestId } = renderComponent();
	store.disabledSources = ['workflow_review'];
	await waitAllPromises();
	expect(router.currentRoute.value.fullPath).toBe('/inbox');
	expect(queryByTestId('review-detail')).not.toBeInTheDocument();
});

it('removes only the unavailable identity from both lists and keeps its detail selected', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	store.lists.waiting.items = [reviewItem(), resultItem()];
	store.lists.closed.items = [reviewItem()];
	const { getByTestId } = renderComponent();
	reportChange({ type: 'workflow_review', id: 'req-1', unavailable: true });
	await waitAllPromises();
	expect(store.lists.waiting.items).toEqual([resultItem()]);
	expect(store.lists.closed.items).toEqual([]);
	expect(store.fetchSummary).toHaveBeenCalledOnce();
	expect(getByTestId('review-detail')).toHaveAttribute('data-id', 'req-1');
});

it.each([
	['', 'activity'],
	['changes', 'changes'],
	['bogus', 'activity'],
])('maps the tab query %s to %s', async (query, tab) => {
	await router.replace(`/inbox?type=workflow_review&itemId=req-1&tab=${query}`);
	const { getByTestId } = renderComponent();
	expect(getByTestId('review-detail')).toHaveAttribute('data-tab', tab);
});

it('writes detail tabs to the URL and keeps selection and state', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1&state=closed');
	const { getByTestId } = renderComponent();
	getByTestId('select-changes-tab').click();
	await waitAllPromises();
	expect(router.currentRoute.value.query).toEqual({
		type: 'workflow_review',
		itemId: 'req-1',
		state: 'closed',
		tab: 'changes',
	});
	getByTestId('select-activity-tab').click();
	await waitAllPromises();
	expect(router.currentRoute.value.query).toEqual({
		type: 'workflow_review',
		itemId: 'req-1',
		state: 'closed',
	});
});

it('follows a selected item to Closed after its detail reports the new state', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	renderComponent();
	store.refreshListAndSummary.mockClear();
	reportChange({ type: 'workflow_review', id: 'req-1', state: 'closed' });
	await waitAllPromises();
	expect(store.refreshListAndSummary).toHaveBeenCalledOnce();
	expect(router.currentRoute.value.fullPath).toBe(
		'/inbox?type=workflow_review&itemId=req-1&state=closed',
	);
});

it.each([undefined, 'open'] as const)(
	'refreshes without navigation for state %s',
	async (state) => {
		await router.replace('/inbox?type=workflow_review&itemId=req-1');
		renderComponent();
		store.refreshListAndSummary.mockClear();
		reportChange({ type: 'workflow_review', id: 'req-1', state });
		await waitAllPromises();
		expect(store.refreshListAndSummary).toHaveBeenCalledOnce();
		expect(router.currentRoute.value.fullPath).toBe('/inbox?type=workflow_review&itemId=req-1');
	},
);

it('does not replace the URL when already on Closed', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1&state=closed');
	renderComponent();
	const replace = vi.spyOn(router, 'replace');
	reportChange({ type: 'workflow_review', id: 'req-1', state: 'closed' });
	await waitAllPromises();
	expect(replace).not.toHaveBeenCalled();
});

it.each(['select-other-review', 'select-result'])(
	'reconciles a late decision without following it after %s',
	async (target) => {
		await router.replace('/inbox?type=workflow_review&itemId=req-1');
		const { getByTestId } = renderComponent();
		const finishOldDecision = reportChange;
		getByTestId(target).click();
		await waitAllPromises();
		const path = router.currentRoute.value.fullPath;
		store.refreshListAndSummary.mockClear();
		finishOldDecision({ type: 'workflow_review', id: 'req-1', state: 'closed' });
		await waitAllPromises();
		expect(store.refreshListAndSummary).toHaveBeenCalledOnce();
		expect(router.currentRoute.value.fullPath).toBe(path);
	},
);

it('ignores callbacks after the Inbox view unmounts', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	const { unmount } = renderComponent();
	unmount();
	store.refreshListAndSummary.mockClear();
	reportChange({ type: 'workflow_review', id: 'req-1', state: 'closed' });
	expect(store.refreshListAndSummary).not.toHaveBeenCalled();
});

it('dereferences the current detail entry for background refresh', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	const { getByTestId, unmount } = renderComponent();
	const refreshSelected = store.activate.mock.calls[0][0];
	await refreshSelected?.();
	expect(refreshDetail).toHaveBeenCalledOnce();
	getByTestId('select-result').click();
	await waitAllPromises();
	await refreshSelected?.();
	expect(refreshDetail).toHaveBeenCalledOnce();
	getByTestId('select-review').click();
	await waitAllPromises();
	await refreshSelected?.();
	expect(refreshDetail).toHaveBeenCalledTimes(2);
	unmount();
	await refreshSelected?.();
	expect(refreshDetail).toHaveBeenCalledTimes(2);
});

it('leaves another page unchanged when an old entry reports a tab or item change', async () => {
	await router.replace('/inbox?type=workflow_review&itemId=req-1');
	const { getByTestId } = renderComponent();
	const oldTab = getByTestId('select-changes-tab');
	await router.replace('/settings/roles?tab=roles');
	oldTab.click();
	reportChange({ type: 'workflow_review', id: 'req-1', state: 'closed' });
	await waitAllPromises();
	expect(router.currentRoute.value.fullPath).toBe('/settings/roles?tab=roles');
});

function reviewItem(): InboxWorkflowReviewItem {
	return {
		type: 'workflow_review',
		id: 'req-1',
		projectId: 'proj-1',
		title: 'List review',
		workflowName: 'My workflow',
		workflowVersionId: null,
		requester: null,
		authors: [],
		reviewers: [],
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	};
}
function resultItem(): InboxSelfHealingItem {
	return {
		type: 'self_healing_result',
		id: 'req-1',
		projectId: 'p1',
		workflowId: 'w1',
		workflowName: 'Workflow',
		state: 'open',
		outcome: 'fix_ready',
		summary: 'Fix ready',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		completedAt: '2024-01-01T00:00:00.000Z',
	};
}

it('routes group pagination and retry to the named slice', async () => {
	const loadAuthored = vi.spyOn(store.lists.authored, 'loadMore').mockResolvedValue(undefined);
	const retryWaiting = vi.spyOn(store.lists.waiting, 'retry').mockResolvedValue(undefined);
	const { getByTestId } = renderComponent();
	getByTestId('load-authored').click();
	getByTestId('retry-waiting').click();
	await waitAllPromises();
	expect(loadAuthored).toHaveBeenCalledOnce();
	expect(retryWaiting).toHaveBeenCalledOnce();
});

it('shows the Open empty state only after both groups load successfully', async () => {
	store.lists.waiting.hasLoaded = true;
	const { queryByTestId } = renderComponent();
	await waitAllPromises();
	expect(queryByTestId('inbox-empty')).not.toBeInTheDocument();
	store.lists.authored.hasLoaded = true;
	await waitAllPromises();
	expect(queryByTestId('inbox-empty')).toBeInTheDocument();
});

it('does not show an empty Inbox when one group has rows and the other fails', async () => {
	store.lists.waiting.hasLoaded = true;
	store.lists.waiting.items = [reviewItem()];
	store.lists.authored.error = new Error('timeout');
	const { queryByTestId } = renderComponent();
	await waitAllPromises();
	expect(queryByTestId('inbox-empty')).not.toBeInTheDocument();
});

it('restarts a partial group after a page failure while retaining exact page retry', async () => {
	const request = vi
		.fn()
		.mockResolvedValueOnce({
			data: [resultItem()],
			nextCursor: 'partial-next',
			hasMore: true,
			partial: true,
			failedSources: ['workflow_review'],
			disabledSources: [],
		})
		.mockRejectedValueOnce(new Error('Page failed'))
		.mockRejectedValueOnce(new Error('Page still failed'))
		.mockResolvedValueOnce({
			data: [reviewItem(), resultItem()],
			nextCursor: null,
			hasMore: false,
			partial: false,
			failedSources: [],
			disabledSources: [],
		});
	const waiting = createInboxListSlice(request, vi.fn());
	store.lists.waiting = waiting;
	await waiting.fetchList();
	await waiting.loadMore();
	const { getByTestId } = renderComponent();
	getByTestId('retry-waiting').click();
	await waitAllPromises();
	expect(request).toHaveBeenLastCalledWith('partial-next');
	expect(waiting.partial).toBe(true);
	getByTestId('refresh-waiting').click();
	await waitAllPromises();
	expect(request).toHaveBeenLastCalledWith();
	expect(waiting.items.map((item) => item.type)).toEqual([
		'workflow_review',
		'self_healing_result',
	]);
	expect(waiting.partial).toBe(false);
	expect(waiting.error).toBeNull();
	expect(waiting.nextCursor).toBeNull();
});
