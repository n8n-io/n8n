import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { ScimDeprovisioningService } from '../scim-deprovisioning.service';
import type { ScimOptInService } from '../scim-opt-in.service';
import { ScimTransferTargetController } from '../scim-transfer-target.controller';

describe('ScimTransferTargetController', () => {
	const scimOptInService = mock<ScimOptInService>();
	const scimDeprovisioningService = mock<ScimDeprovisioningService>();
	const controller = new ScimTransferTargetController(scimOptInService, scimDeprovisioningService);

	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		ScimTransferTargetController as never,
	);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('runs the opt-in gate before every route', async () => {
		const [req, res] = [mock<Request>(), mock<Response>()];
		const next: NextFunction = vi.fn();

		await controller.requireOptIn(req, res, next);

		// Before auth, so that a caller without a session or the scope also gets 404.
		expect(metadata.preAuthMiddlewares).toEqual(['requireOptIn']);
		expect(metadata.middlewares).toEqual([]);
		expect(scimOptInService.gate).toHaveBeenCalledWith(req, res, next);
	});

	// The picker lists every user and team project of the instance.
	it.each(Array.from(metadata.routes.entries()))('%s is gated by scim:manage', (_, route) => {
		expect(route.accessScope).toEqual({ scope: 'scim:manage', globalOnly: true });
	});

	it('serves GET /transfer-targets', () => {
		expect(Array.from(metadata.routes.values())).toEqual([
			expect.objectContaining({ method: 'get', path: '/transfer-targets' }),
		]);
	});

	it('returns the transfer targets for the query', async () => {
		const response = { people: { total: 1, count: 1, items: [] } };
		scimDeprovisioningService.findTransferTargets.mockResolvedValue(response);
		const query = { search: 'ada', type: 'people' as const, skip: 0, take: 50 };

		await expect(
			controller.getTransferTargets(mock<AuthenticatedRequest>(), mock<Response>(), query),
		).resolves.toBe(response);
		expect(scimDeprovisioningService.findTransferTargets).toHaveBeenCalledWith(query);
	});
});
