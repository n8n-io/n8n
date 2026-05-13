import { mock } from 'jest-mock-extended';

import { OrchestrationController } from '@/controllers/orchestration.controller';
import { WorkerPoolsService } from '@/scaling/worker-pools.service';
import type { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import type { License } from '@/license';

describe('OrchestrationController', () => {
	const license = mock<License>();
	const workerStatusService = mock<WorkerStatusService>();
	const workerPoolsService = mock<WorkerPoolsService>();
	const controller = new OrchestrationController(license, workerStatusService, workerPoolsService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkerPools', () => {
		it('should return pools from WorkerPoolsService', () => {
			workerPoolsService.getAvailablePools.mockReturnValue(['default']);

			const result = controller.getWorkerPools();

			expect(result).toEqual({ pools: ['default'] });
		});

		it('should delegate to WorkerPoolsService.getAvailablePools', () => {
			workerPoolsService.getAvailablePools.mockReturnValue([]);

			controller.getWorkerPools();

			expect(workerPoolsService.getAvailablePools).toHaveBeenCalledTimes(1);
		});
	});
});
