import type { InboxWorkflowReviewItem } from '@n8n/api-types';
import { createMemoryHistory, createRouter } from 'vue-router';

import { InboxModule } from './inbox.module';
import { inboxItemLocation, isInboxRoute, selectionFromRoute } from './inbox.routes';

const settingsStore = vi.hoisted(() => ({ settings: { inbox: { enabled: true } } }));
vi.mock('@n8n/stores/settings.store', () => ({ useSettingsStore: () => settingsStore }));

beforeEach(() => {
	settingsStore.settings.inbox.enabled = true;
});

function createInboxRouter() {
	const routes = (InboxModule.routes ?? []).map((route) =>
		'component' in route ? { ...route, component: { template: '<div />' } } : route,
	);
	return createRouter({ history: createMemoryHistory(), routes });
}

const review = {
	type: 'workflow_review',
	id: 'review-1',
	state: 'open',
	projectId: 'project',
	title: 'Review',
	workflowName: 'Workflow',
	workflowVersionId: null,
	requester: null,
	authors: [],
	reviewers: [],
	decision: 'pending',
	createdAt: '',
	updatedAt: '',
} satisfies InboxWorkflowReviewItem;

it('redirects to home when Inbox is disabled', async () => {
	settingsStore.settings.inbox.enabled = false;
	const router = createInboxRouter();
	router.addRoute({ path: '/', name: 'home', component: { template: '<div />' } });
	await router.push('/inbox');
	expect(router.currentRoute.value).toMatchObject({ path: '/', name: 'home' });
});

it('redirects an old review link and preserves filters and the detail tab', async () => {
	const router = createInboxRouter();
	await router.push('/reviews/review-1?state=closed&tab=changes&filter=a&filter=b');
	expect(router.currentRoute.value.path).toBe('/inbox/reviews/review-1');
	expect(router.currentRoute.value.query).toEqual({
		state: 'closed',
		tab: 'changes',
		filter: ['a', 'b'],
	});
});

it('redirects the old review list without selecting an item', async () => {
	const router = createInboxRouter();
	await router.push('/reviews?state=closed');
	expect(router.currentRoute.value.fullPath).toBe('/inbox?state=closed');
	expect(selectionFromRoute(router.currentRoute.value)).toBeNull();
});

it('selects a review when opening its detail route directly', async () => {
	const router = createInboxRouter();
	await router.push('/inbox/reviews/review-1');
	expect(selectionFromRoute(router.currentRoute.value)).toEqual({
		type: 'workflow_review',
		id: 'review-1',
	});
});

it.each([
	['Inbox', true],
	['WorkflowReviewRequestsView', true],
	['Workflow', false],
	[undefined, false],
])('recognizes the Inbox route %s: %s', (name, expected) => {
	expect(isInboxRoute({ name })).toBe(expected);
});

it('keeps the tab only when selecting the same item', async () => {
	const router = createInboxRouter();
	await router.push('/inbox/reviews/review-1?state=closed&tab=changes');
	expect(router.resolve(inboxItemLocation(review, router.currentRoute.value))).toMatchObject({
		path: '/inbox/reviews/review-1',
		query: { state: 'closed', tab: 'changes' },
	});
	expect(
		router.resolve(inboxItemLocation({ ...review, id: 'review-2' }, router.currentRoute.value))
			.query,
	).toEqual({ state: 'closed' });
});

it('restores selection and tabs when navigating back and forward', async () => {
	const router = createInboxRouter();
	await router.push('/inbox');
	await router.push('/inbox/reviews/review-1?tab=changes');
	await router.push(inboxItemLocation({ ...review, id: 'review-2' }, router.currentRoute.value));
	router.back();
	await vi.waitFor(() =>
		expect(router.currentRoute.value.fullPath).toBe('/inbox/reviews/review-1?tab=changes'),
	);
	expect(selectionFromRoute(router.currentRoute.value)).toEqual({
		type: 'workflow_review',
		id: 'review-1',
	});
	router.forward();
	await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/inbox/reviews/review-2'));
	expect(selectionFromRoute(router.currentRoute.value)?.id).toBe('review-2');
	expect(router.currentRoute.value.query.tab).toBeUndefined();
});
