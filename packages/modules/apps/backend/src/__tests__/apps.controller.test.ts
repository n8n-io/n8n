import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AppsController } from '../apps.controller';
import { AppsListController } from '../apps-list.controller';

describe('app route scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata);
	const routes = metadata.getControllerMetadata(AppsController as never).routes;

	it('registers all app CRUD routes', () => {
		expect([...routes.keys()].sort()).toEqual(['create', 'delete', 'get', 'list', 'update']);
	});

	it.each([...routes])('%s requires a project app scope', (_name, route) => {
		expect(route.skipAuth).not.toBe(true);
		expect(route.accessScope?.globalOnly).toBe(false);
		expect(route.accessScope?.scope).toMatch(/^app:/);
	});

	it('uses the list scope for project lists', () => {
		expect(routes.get('list')?.accessScope).toEqual({ scope: 'app:list', globalOnly: false });
	});

	it('keeps overview authentication and delegates project scope checks to the service', () => {
		const route = metadata.getControllerMetadata(AppsListController as never).routes.get('list');
		expect(route).toBeDefined();
		expect(route?.skipAuth).not.toBe(true);
		expect(route?.accessScope).toBeUndefined();
	});
});
