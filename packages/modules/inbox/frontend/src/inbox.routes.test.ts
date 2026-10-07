import { createMemoryHistory, createRouter } from 'vue-router';

import { InboxModule } from './inbox.module';
import { selectionFromQuery } from './inbox.routes';

it('preserves review selection and tabs from an old deep link', async () => {
	const routes = (InboxModule.routes ?? []).map((route) =>
		route.path === '/inbox'
			? { ...route, beforeEnter: undefined, component: { template: '<div />' } }
			: route,
	);
	const router = createRouter({ history: createMemoryHistory(), routes });
	await router.push('/reviews/review-1?state=closed&tab=changes');
	expect(router.currentRoute.value.path).toBe('/inbox');
	expect(router.currentRoute.value.query).toEqual({
		type: 'workflow_review',
		itemId: 'review-1',
		state: 'closed',
		tab: 'changes',
	});
});

it('requires all identifiers for a saved result selection', () => {
	expect(selectionFromQuery({ type: 'self_healing_result', itemId: 'result' })).toBeNull();
	expect(
		selectionFromQuery({
			type: 'self_healing_result',
			itemId: 'result',
			projectId: 'project',
			workflowId: 'workflow',
		}),
	).toEqual({
		type: 'self_healing_result',
		id: 'result',
		projectId: 'project',
		workflowId: 'workflow',
	});
});

it('keeps the detail tab when the same row is selected again', async () => {
	const { inboxItemLocation } = await import('./inbox.routes');
	const item = {
		type: 'self_healing_result',
		id: 'result',
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
	expect(inboxItemLocation(item, { type: item.type, itemId: item.id, tab: 'changes' })).toEqual({
		name: 'Inbox',
		query: {
			type: item.type,
			itemId: item.id,
			projectId: 'project',
			workflowId: 'workflow',
			tab: 'changes',
		},
	});
	expect(
		inboxItemLocation(item, { type: 'workflow_review', itemId: item.id, tab: 'changes' }),
	).toEqual({
		name: 'Inbox',
		query: { type: item.type, itemId: item.id, projectId: 'project', workflowId: 'workflow' },
	});
});
