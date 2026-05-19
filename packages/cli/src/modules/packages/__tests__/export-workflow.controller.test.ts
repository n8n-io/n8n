import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { PassThrough } from 'node:stream';

import { PackagesController } from '../packages.controller';
import type { PackagesService } from '../packages.service';

describe('ImportExportController', () => {
	describe('exportWorkflows', () => {
		it('sets gzip Content-Type and .n8np attachment Content-Disposition on the response', async () => {
			const service = mock<PackagesService>();
			service.exportWorkflows.mockResolvedValue(new PassThrough());

			const controller = new PackagesController(service);
			const req = { user: { id: 'user-1' } } as unknown as AuthenticatedRequest;
			const res = mock<Response>();

			await controller.exportWorkflows(req, res, { workflowIds: ['wf-1'] });

			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/gzip');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="export.n8np"',
			);
		});

		it('forwards the authenticated user and workflow ids to the service', async () => {
			const service = mock<PackagesService>();
			service.exportWorkflows.mockResolvedValue(new PassThrough());

			const controller = new PackagesController(service);
			const user = { id: 'user-1' };
			const req = { user } as unknown as AuthenticatedRequest;

			await controller.exportWorkflows(req, mock<Response>(), { workflowIds: ['wf-a', 'wf-b'] });

			expect(service.exportWorkflows).toHaveBeenCalledWith({
				user,
				workflowIds: ['wf-a', 'wf-b'],
			});
		});
	});

	describe('route decorators', () => {
		// Catches regressions where a future edit drops the license gate, or quietly
		// re-introduces a controller-level scope decorator (the bulk endpoint must
		// stay un-scoped — authorization is enforced per-workflow in the service).
		const route = Container.get(ControllerRegistryMetadata)
			.getControllerMetadata(PackagesController as never)
			.routes.get('exportWorkflows');

		it('is gated by the feat:packages license', () => {
			expect(route?.licenseFeature).toBe('feat:packages');
		});

		it('has no @ProjectScope or @GlobalScope decorator', () => {
			expect(route?.accessScope).toBeUndefined();
		});
	});
});
