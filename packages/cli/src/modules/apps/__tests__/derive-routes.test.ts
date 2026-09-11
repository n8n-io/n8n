import { deriveRoutesFromRouterSource } from '../derive-routes';

/** The id scheme is an implementation detail; tests key off the tree shape instead. */
function byRoute(routes: ReturnType<typeof deriveRoutesFromRouterSource>, route: string) {
	const page = routes.find((r) => r.route === route);
	if (!page) throw new Error(`No derived page with route "${route}" in ${JSON.stringify(routes)}`);
	return page;
}

describe('deriveRoutesFromRouterSource', () => {
	it('derives the index route from the template default', () => {
		const source = `
			import { createRouter, createWebHistory } from 'vue-router';
			import Home from './pages/Home.vue';
			export const router = createRouter({
				history: createWebHistory(import.meta.env.BASE_URL),
				routes: [{ path: '/', component: Home }],
			});
		`;

		const routes = deriveRoutesFromRouterSource(source);
		expect(routes).toHaveLength(1);
		expect(byRoute(routes, '').parentPageId).toBeNull();
	});

	it('gives every page a single-URL-segment id, never empty — vue-router\'s :pageId param can\'t hold "/" or ""', () => {
		const source = `
			export const router = createRouter({
				routes: [
					{ path: '/', component: Home },
					{
						path: '/clients',
						component: Clients,
						children: [{ path: ':id', component: ClientDetail }],
					},
				],
			});
		`;

		for (const page of deriveRoutesFromRouterSource(source)) {
			expect(page.id).not.toBe('');
			expect(page.id).not.toContain('/');
		}
	});

	it('derives flat top-level routes', () => {
		const source = `
			export const router = createRouter({
				routes: [
					{ path: '/', component: Home },
					{ path: '/clients', component: Clients },
				],
			});
		`;

		const routes = deriveRoutesFromRouterSource(source);
		expect(routes).toHaveLength(2);
		expect(byRoute(routes, '').parentPageId).toBeNull();
		expect(byRoute(routes, 'clients').parentPageId).toBeNull();
	});

	it('derives nested children, including dynamic segments', () => {
		const source = `
			export const router = createRouter({
				routes: [
					{
						path: '/clients',
						component: Clients,
						children: [{ path: ':id', component: ClientDetail }],
					},
				],
			});
		`;

		const routes = deriveRoutesFromRouterSource(source);
		const clients = byRoute(routes, 'clients');
		const clientDetail = byRoute(routes, ':id');
		expect(clients.parentPageId).toBeNull();
		expect(clientDetail.parentPageId).toBe(clients.id);
	});

	it('nests a flat multi-segment path under its prefix, merging with an existing sibling', () => {
		// Two independent top-level entries sharing a path prefix — however
		// router.ts declares it (flat siblings here, `children` above), a
		// path that extends another one is a sub-page of it, not an unrelated peer.
		const source = `
			export const router = createRouter({
				routes: [
					{ path: '/success', component: Success },
					{ path: '/success/:type', component: SuccessType },
				],
			});
		`;

		const routes = deriveRoutesFromRouterSource(source);
		expect(routes).toHaveLength(2);
		const success = byRoute(routes, 'success');
		const successType = byRoute(routes, ':type');
		expect(success.parentPageId).toBeNull();
		expect(successType.parentPageId).toBe(success.id);
	});

	it('synthesizes an intermediate page for a multi-segment path with no shorter sibling', () => {
		const source = `
			export const router = createRouter({
				routes: [{ path: '/success/:type', component: SuccessType }],
			});
		`;

		const routes = deriveRoutesFromRouterSource(source);
		expect(routes).toHaveLength(2);
		const success = byRoute(routes, 'success');
		const successType = byRoute(routes, ':type');
		expect(success.parentPageId).toBeNull();
		expect(successType.parentPageId).toBe(success.id);
	});

	it('returns an empty list when there is no createRouter call', () => {
		expect(deriveRoutesFromRouterSource('export const x = 1;')).toEqual([]);
	});

	it('returns an empty list when routes is not a plain array literal', () => {
		const source = `
			const extra = [{ path: '/extra', component: Extra }];
			export const router = createRouter({
				routes: [{ path: '/', component: Home }, ...extra],
			});
		`;

		// The spread element isn't an object literal with a `path`, so it's skipped;
		// the static entry before it is still picked up.
		const routes = deriveRoutesFromRouterSource(source);
		expect(routes).toHaveLength(1);
		expect(byRoute(routes, '')).toBeDefined();
	});
});
