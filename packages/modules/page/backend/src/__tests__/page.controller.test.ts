import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { PageLookupController } from '../page-lookup.controller';
import { PageController } from '../page.controller';

const routesOf = (controller: Parameters<ControllerRegistryMetadata['getControllerMetadata']>[0]) =>
	Array.from(
		Container.get(ControllerRegistryMetadata).getControllerMetadata(controller).routes.entries(),
	).map(([handlerName, route]) => ({ handlerName, route }));

describe('PageController', () => {
	it.each(routesOf(PageController as never))(
		'should gate $handlerName with a project-scoped page scope',
		({ route }) => {
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('page:')).toBe(true);
			expect(route.skipAuth).toBeFalsy();
		},
	);

	it('should map each route to the scope of its operation', () => {
		const scopes = Object.fromEntries(
			routesOf(PageController as never).map(({ handlerName, route }) => [
				handlerName,
				route.accessScope?.scope,
			]),
		);

		expect(scopes).toEqual({
			listPages: 'page:list',
			getProjectOverview: 'page:list',
			createPage: 'page:create',
			ensureProjectSummary: 'page:create',
			getPage: 'page:read',
			updatePage: 'page:update',
			deletePage: 'page:delete',
		});
	});

	it('should register the overview route before the page id routes', () => {
		const paths = routesOf(PageController as never).map(({ route }) => route.path);

		expect(paths.indexOf('/overview')).toBeLessThan(paths.indexOf('/:pageId'));
	});
});

describe('PageLookupController', () => {
	it('should keep every route authenticated', () => {
		const routes = routesOf(PageLookupController as never);

		expect(routes.map(({ handlerName }) => handlerName)).toEqual([
			'listAllPages',
			'listReferencingPages',
			'listNodeReferences',
			'getOverview',
			'getBacklinks',
			'getPage',
		]);
		expect(routes.every(({ route }) => !route.skipAuth)).toBe(true);
	});

	it('should register the static routes before the page id routes', () => {
		const paths = routesOf(PageLookupController as never).map(({ route }) => route.path);

		expect(paths).toEqual([
			'/',
			'/referencing',
			'/node-references',
			'/overview',
			'/:pageId/backlinks',
			'/:pageId',
		]);
	});

	it('should read every route with GET', () => {
		const methods = routesOf(PageLookupController as never).map(({ route }) => route.method);

		expect(new Set(methods)).toEqual(new Set(['get']));
	});
});
