import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AppBuildController } from '../app-build.controller';

describe('AppBuildController', () => {
	const routes = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AppBuildController as never,
	).routes;
	it.each([...routes])('%s requires a project app scope', (_name, route) => {
		expect(route.skipAuth).not.toBe(true);
		expect(route.accessScope?.globalOnly).toBe(false);
		expect(route.accessScope?.scope).toMatch(/^app:/);
	});
	it('uses read permission for status and update permission for retry', () => {
		expect(routes.get('status')?.accessScope?.scope).toBe('app:read');
		expect(routes.get('retry')?.accessScope?.scope).toBe('app:update');
	});
});
