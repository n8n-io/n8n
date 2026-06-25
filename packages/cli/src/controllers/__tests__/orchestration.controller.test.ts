import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { OrchestrationController } from '@/controllers/orchestration.controller';
import type { License } from '@/license';
import type { WorkerStatusService } from '@/scaling/worker-status.service.ee';

describe('OrchestrationController', () => {
	const license = mock<License>();
	const workerStatusService = mock<WorkerStatusService>();
	const controller = new OrchestrationController(license, workerStatusService);

	const req = mock<AuthenticatedRequest>({ user: { id: 'user-1' } });

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkersStatusAll', () => {
		it('requests worker status when licensed', async () => {
			license.isWorkerViewLicensed.mockReturnValue(true);

			await controller.getWorkersStatusAll(req);

			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalledWith('user-1');
		});

		it('does nothing when not licensed', async () => {
			license.isWorkerViewLicensed.mockReturnValue(false);

			await controller.getWorkersStatusAll(req);

			expect(workerStatusService.requestWorkerStatus).not.toHaveBeenCalled();
		});
	});
});
