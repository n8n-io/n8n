import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { PassThrough } from 'node:stream';

import { N8nPackagesController } from '../n8n-packages.controller';
import type { N8nPackagesService } from '../n8n-packages.service';

describe('n8n-packages export', () => {
	describe('exportWorkflows', () => {
		it('sets gzip Content-Type and .n8np attachment Content-Disposition on the response', async () => {
			const service = mock<N8nPackagesService>();
			service.exportWorkflows.mockResolvedValue(new PassThrough());

			const controller = new N8nPackagesController(service);
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
			const service = mock<N8nPackagesService>();
			service.exportWorkflows.mockResolvedValue(new PassThrough());

			const controller = new N8nPackagesController(service);
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
		const route = Container.get(ControllerRegistryMetadata)
			.getControllerMetadata(N8nPackagesController as never)
			.routes.get('exportWorkflows');

		it('is gated by the feat:n8nPackages license', () => {
			expect(route?.licenseFeature).toBe('feat:n8nPackages');
		});

		it('enforces workflow:export global scope', () => {
			expect(route?.accessScope).toEqual({ scope: 'workflow:export', globalOnly: true });
		});
	});
});
