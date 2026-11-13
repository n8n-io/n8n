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

	it('requires the MCP access scope on the route', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			UiExtensionViewsController as never,
		);
		const route = metadata.routes.get('listViews');

		expect(metadata.basePath).toBe('/ui-extensions');
		expect(route).toMatchObject({
			method: 'get',
			path: '/views',
			accessScope: { scope: 'mcpApiKey:create', globalOnly: true },
		});
	});
});
