import type { AuthenticatedRequest, Person } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { UiExtensionViewsController } from '../ui-extension-views.controller';
import type { UiExtensionViewsService } from '../ui-extension-views.service';

describe('UiExtensionViewsController', () => {
	it('lists the views of the user who makes the request', async () => {
		const service = mock<UiExtensionViewsService>();
		service.list.mockResolvedValue([]);
		const controller = new UiExtensionViewsController(service);
		const req = mock<AuthenticatedRequest>({ user: mock<Person>({ id: 'user-1' }) });

		await expect(controller.listViews(req)).resolves.toEqual([]);
		expect(service.list).toHaveBeenCalledWith('user-1');
	});

	it('gates every route with a global scope', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			UiExtensionViewsController as never,
		);

		expect(metadata.basePath).toBe('/ui-extensions');
		expect(metadata.routes.size).toBeGreaterThan(0);
		for (const [handlerName, route] of metadata.routes) {
			expect(route.skipAuth, handlerName).toBeFalsy();
			expect(route.accessScope, handlerName).toEqual({
				scope: 'mcpApiKey:create',
				globalOnly: true,
			});
		}
	});
});
