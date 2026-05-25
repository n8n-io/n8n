import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { License } from '@/license';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

import { OrchestrationController } from '../orchestration.controller';

const routeMetadata = Container.get(ControllerRegistryMetadata);

describe('OrchestrationController', () => {
	const licenseService = mock<License>();
	const workerStatusService = mock<WorkerStatusService>();
	const controller = new OrchestrationController(licenseService, workerStatusService);

	beforeEach(() => {
		jest.clearAllMocks();
		licenseService.isWorkerViewLicensed.mockReturnValue(true);
	});

	describe('drainWorker', () => {
		it('should trigger a targeted drain and respond with 202 Accepted', async () => {
			const res = mock<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();

			const result = await controller.drainWorker(mock(), res, 'worker-123');

			expect(workerStatusService.drainWorker).toHaveBeenCalledWith('worker-123');
			expect(res.status).toHaveBeenCalledWith(202);
			expect(res.send).toHaveBeenCalledWith();
			expect(result).toBe(res);
		});

		it('should short-circuit when worker view is not licensed', async () => {
			licenseService.isWorkerViewLicensed.mockReturnValue(false);
			const res = mock<Response>();

			const result = await controller.drainWorker(mock(), res, 'worker-123');

			expect(workerStatusService.drainWorker).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
			expect(res.send).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
	});

	describe('route metadata', () => {
		it('should require authentication for drainWorker', () => {
			const route = routeMetadata.getRouteMetadata(
				OrchestrationController as unknown as Parameters<typeof routeMetadata.getRouteMetadata>[0],
				'drainWorker',
			);

			expect(route.skipAuth).toBe(false);
		});

		it('should require workersView:manage scope for drainWorker', () => {
			const route = routeMetadata.getRouteMetadata(
				OrchestrationController as unknown as Parameters<typeof routeMetadata.getRouteMetadata>[0],
				'drainWorker',
			);

			expect(route.accessScope).toEqual({ scope: 'workersView:manage', globalOnly: true });
		});
	});
});
