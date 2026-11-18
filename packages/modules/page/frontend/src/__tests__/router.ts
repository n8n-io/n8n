import { createMemoryHistory, createRouter, type Router } from 'vue-router';

const Empty = { template: '<div />' };

/** A router that knows the addresses that the tests open. */
export function createTestRouter(): Router {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: Empty },
			{ path: '/workflow/:workflowId/:nodeId?', component: Empty },
			{ path: '/page/:pageId', component: Empty },
			{ path: '/:pathMatch(.*)*', component: Empty },
		],
	});
}
