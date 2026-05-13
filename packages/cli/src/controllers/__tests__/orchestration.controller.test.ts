import { UpdateWorkerPoolAssignmentDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { OrchestrationController } from '@/controllers/orchestration.controller';
import type { License } from '@/license';
import type { PoolConfigService } from '@/scaling/pool-config.service';
import type { WorkerPoolsService } from '@/scaling/worker-pools.service';
import type { WorkerStatusService } from '@/scaling/worker-status.service.ee';

describe('OrchestrationController', () => {
	const license = mock<License>();
	const workerStatusService = mock<WorkerStatusService>();
	const workerPoolsService = mock<WorkerPoolsService>();
	const poolConfigService = mock<PoolConfigService>();
	const controller = new OrchestrationController(
		license,
		workerStatusService,
		workerPoolsService,
		poolConfigService,
	);

	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkerPools', () => {
		it('should return pools and assignment from WorkerPoolsService', async () => {
			workerPoolsService.getPoolsState.mockResolvedValue({
				pools: ['default'],
				assignment: { production: 'gpu' },
			});

			const result = await controller.getWorkerPools();

			expect(result).toEqual({
				pools: ['default'],
				assignment: { production: 'gpu' },
			});
			expect(workerPoolsService.getPoolsState).toHaveBeenCalledTimes(1);
		});
	});

	describe('updateWorkerPoolAssignment', () => {
		it('should delegate to PoolConfigService.setPoolAssignment with the DTO', async () => {
			const dto = new UpdateWorkerPoolAssignmentDto({ production: 'gpu' });

			poolConfigService.setPoolAssignment.mockResolvedValue({ production: 'gpu' });

			const result = await controller.updateWorkerPoolAssignment(req, res, dto);

			expect(poolConfigService.setPoolAssignment).toHaveBeenCalledWith(dto);
			expect(result).toEqual({ production: 'gpu' });
		});
	});
});
