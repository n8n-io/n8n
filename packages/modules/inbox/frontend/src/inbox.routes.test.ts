import { createMemoryHistory, createRouter } from 'vue-router';

import { InboxModule } from './inbox.module';
import { inboxItemLocation, isInboxRoute, selectionFromRoute } from './inbox.routes';

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ settings: { inbox: { enabled: true } } }),
}));

function createInboxRouter() {
	const routes = (InboxModule.routes ?? []).map((route) =>
		'component' in route ? { ...route, component: { template: '<div />' } } : route,
	);
	return createRouter({ history: createMemoryHistory(), routes });
}

const result = {
	type: 'self_healing_result',
	id: 'result-1',
	state: 'open',
	projectId: 'project',
	workflowId: 'workflow',
	workflowName: 'Workflow',
	summary: 'Summary',
	outcome: 'fix_ready',
	createdAt: '',
	updatedAt: '',
	completedAt: '',
} as const;

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

it.each([
	['/inbox/reviews/review-1', { type: 'workflow_review', id: 'review-1' }],
	[
		'/inbox/assistant-results/result-1?projectId=project&workflowId=workflow',
		{
			type: result.type,
			id: result.id,
			projectId: result.projectId,
			workflowId: result.workflowId,
		},
	],
])('selects the item when opening %s directly', async (path, selection) => {
	const router = createInboxRouter();
	await router.push(path);
	expect(selectionFromRoute(router.currentRoute.value)).toEqual(selection);
});

it.each(['', '?projectId=project', '?workflowId=workflow'])(
	'requires Assistant scope: %s',
	async (query) => {
		const router = createInboxRouter();
		await router.push(`/inbox/assistant-results/result-1${query}`);
		expect(selectionFromRoute(router.currentRoute.value)).toBeNull();
	},
);

it.each([
	['Inbox', true],
	['WorkflowReviewRequestsView', true],
	['InboxAssistantResult', true],
	['Workflow', false],
	[undefined, false],
])('recognizes the Inbox route %s: %s', (name, expected) => {
	expect(isInboxRoute({ name })).toBe(expected);
});

it('keeps the tab only when selecting the same item', async () => {
	const router = createInboxRouter();
	await router.push(
		'/inbox/assistant-results/result-1?projectId=project&workflowId=workflow&state=closed&tab=changes',
	);
	expect(router.resolve(inboxItemLocation(result, router.currentRoute.value))).toMatchObject({
		path: '/inbox/assistant-results/result-1',
		query: { projectId: 'project', workflowId: 'workflow', state: 'closed', tab: 'changes' },
	});
	expect(
		router.resolve(inboxItemLocation({ ...result, id: 'result-2' }, router.currentRoute.value))
			.query,
	).toEqual({
		projectId: 'project',
		workflowId: 'workflow',
		state: 'closed',
	});
	await router.push('/inbox/reviews/result-1?state=closed&tab=changes');
	expect(router.resolve(inboxItemLocation(result, router.currentRoute.value)).query).toEqual({
		projectId: 'project',
		workflowId: 'workflow',
		state: 'closed',
	});
});

it('restores selection and tabs when navigating back and forward', async () => {
	const router = createInboxRouter();
	await router.push('/inbox');
	await router.push('/inbox/reviews/review-1?tab=changes');
	await router.push(inboxItemLocation(result, router.currentRoute.value));
	router.back();
	await vi.waitFor(() =>
		expect(router.currentRoute.value.fullPath).toBe('/inbox/reviews/review-1?tab=changes'),
	);
	expect(selectionFromRoute(router.currentRoute.value)).toEqual({
		type: 'workflow_review',
		id: 'review-1',
	});
	router.forward();
	await vi.waitFor(() =>
		expect(router.currentRoute.value.path).toBe('/inbox/assistant-results/result-1'),
	);
	expect(selectionFromRoute(router.currentRoute.value)?.id).toBe(result.id);
	expect(router.currentRoute.value.query.tab).toBeUndefined();
});
