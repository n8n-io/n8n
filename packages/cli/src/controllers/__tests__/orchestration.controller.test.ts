import { UpdateWorkerPoolDefaultsDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { OrchestrationController } from '@/controllers/orchestration.controller';
import type { License } from '@/license';
import { WorkerPoolDefaultsService } from '@/scaling/worker-pool-defaults.service';
import { WorkerPoolsService } from '@/scaling/worker-pools.service';
import type { WorkerStatusService } from '@/scaling/worker-status.service.ee';

describe('OrchestrationController', () => {
	const license = mock<License>();
	const workerStatusService = mock<WorkerStatusService>();
	const workerPoolsService = mock<WorkerPoolsService>();
	const workerPoolDefaultsService = mock<WorkerPoolDefaultsService>();
	const controller = new OrchestrationController(
		license,
		workerStatusService,
		workerPoolsService,
		workerPoolDefaultsService,
	);

	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkerPools', () => {
		it('should return pools and defaults from WorkerPoolsService', async () => {
			workerPoolsService.getPoolsState.mockResolvedValue({
				pools: ['default'],
				defaults: {
					production: 'default',
					manual: 'default',
					evaluation: 'default',
				},
			});

			const result = await controller.getWorkerPools();

			expect(result).toEqual({
				pools: ['default'],
				defaults: {
					production: 'default',
					manual: 'default',
					evaluation: 'default',
				},
			});
			expect(workerPoolsService.getPoolsState).toHaveBeenCalledTimes(1);
		});
	});

	describe('updateWorkerPoolDefaults', () => {
		it('should delegate to WorkerPoolDefaultsService.setDefaults with the DTO', async () => {
			const dto = new UpdateWorkerPoolDefaultsDto({ production: 'gpu' });

			workerPoolDefaultsService.setDefaults.mockResolvedValue({
				production: 'gpu',
				manual: 'default',
				evaluation: 'default',
			});

			const result = await controller.updateWorkerPoolDefaults(req, res, dto);

			expect(workerPoolDefaultsService.setDefaults).toHaveBeenCalledWith(dto);
			expect(result).toEqual({
				production: 'gpu',
				manual: 'default',
				evaluation: 'default',
			});
		});
	});
});
