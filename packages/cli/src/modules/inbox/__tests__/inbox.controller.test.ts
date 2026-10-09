import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { getRouteCases } from '@test/controller-route-metadata';

import { InboxController } from '../inbox.controller';
import type { InboxService } from '../inbox.service';

describe('InboxController', () => {
	const routes = getRouteCases(InboxController);

	it('exposes only the shared list and summary reads', () => {
		expect(routes.map(({ handlerName }) => handlerName).sort()).toEqual(['getSummary', 'list']);
	});

	// Cross-project reads use each source's service authorization.
	it.each(routes)(
		'$handlerName requires authentication without a global workflow gate',
		({ route }) => {
			expect(route.skipAuth).toBe(false);
			expect(route.accessScope).toBeUndefined();
			expect(route.licenseFeature).toBeUndefined();
		},
	);

	it('passes the authenticated user and validated query to the service', async () => {
		const service = mock<InboxService>();
		const controller = new InboxController(service);
		const request = mock<AuthenticatedRequest>();
		const query = { state: 'closed' as const, limit: 10 };
		await controller.list(request, mock<Response>(), query);
		await controller.getSummary(request);
		expect(service.list).toHaveBeenCalledWith(request.user, query);
		expect(service.getSummary).toHaveBeenCalledWith(request.user);
	});
});
