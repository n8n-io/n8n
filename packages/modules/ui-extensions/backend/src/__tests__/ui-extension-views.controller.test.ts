import type { AuthenticatedRequest, Person } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { UiExtensionViewsController } from '../ui-extension-views.controller';
import {
	UiExtensionViewNotFoundError,
	type UiExtensionViewsService,
} from '../ui-extension-views.service';

describe('UiExtensionViewsController', () => {
	it('lists the views of the user who makes the request', async () => {
		const service = mock<UiExtensionViewsService>();
		service.list.mockResolvedValue([]);
		const controller = new UiExtensionViewsController(service);
		const req = mock<AuthenticatedRequest>({ user: mock<Person>({ id: 'user-1' }) });

		await expect(controller.listViews(req)).resolves.toEqual([]);
		expect(service.list).toHaveBeenCalledWith('user-1');
	});

	it('removes a record of the user who makes the request', async () => {
		const service = mock<UiExtensionViewsService>();
		const removed = {
			id: 'v1',
			kind: 'page' as const,
			title: 'P',
			source: 'x',
			updatedAt: '',
		};
		service.remove.mockResolvedValue(removed);
		const controller = new UiExtensionViewsController(service);
		const req = mock<AuthenticatedRequest>({ user: mock<Person>({ id: 'user-1' }) });

		await expect(controller.removeView(req, undefined, 'v1')).resolves.toEqual(removed);
		expect(service.remove).toHaveBeenCalledExactlyOnceWith('user-1', 'v1');
	});

	it('answers 404 when the user has no record with the ID', async () => {
		const service = mock<UiExtensionViewsService>();
		service.remove.mockRejectedValue(new UiExtensionViewNotFoundError('builtin:arcade'));
		const controller = new UiExtensionViewsController(service);
		const req = mock<AuthenticatedRequest>({ user: mock<Person>({ id: 'user-1' }) });

		await expect(controller.removeView(req, undefined, 'builtin:arcade')).rejects.toThrow(
			NotFoundError,
		);
	});

	it('serves DELETE /views/:id', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			UiExtensionViewsController as never,
		);

		expect(metadata.routes.get('removeView')).toMatchObject({
			method: 'delete',
			path: '/views/:id',
		});
	});

	it('gates every route with a global scope', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			UiExtensionViewsController as never,
		);

		expect(metadata.basePath).toBe('/ui-extensions');
		expect(metadata.routes.size).toBe(2);
		for (const [handlerName, route] of metadata.routes) {
			expect(route.skipAuth, handlerName).toBeFalsy();
			expect(route.accessScope, handlerName).toEqual({
				scope: 'mcpApiKey:create',
				globalOnly: true,
			});
		}
	});
});
