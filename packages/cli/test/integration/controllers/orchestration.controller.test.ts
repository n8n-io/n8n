import { mockInstance } from '@n8n/backend-test-utils';

import { License } from '@/license';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('OrchestrationController', () => {
	const workerStatusService = mockInstance(WorkerStatusService);
	const license = mockInstance(License);

	const testServer = setupTestServer({ endpointGroups: ['orchestration'] });
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		const member = await createMember();

		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		license.isWorkerViewLicensed.mockReturnValue(true);
	});

	describe('POST /orchestration/worker/:workerId/drain', () => {
		it('should return 401 for unauthenticated requests', async () => {
			await testServer.authlessAgent.post('/orchestration/worker/worker-123/drain').expect(401);

			expect(workerStatusService.drainWorker).not.toHaveBeenCalled();
		});

		it('should return 403 for authenticated users without workersView:manage scope', async () => {
			await memberAgent.post('/orchestration/worker/worker-123/drain').expect(403);

			expect(workerStatusService.drainWorker).not.toHaveBeenCalled();
		});

		it('should trigger a targeted drain and return 202 for authorized users', async () => {
			await ownerAgent.post('/orchestration/worker/worker-123/drain').expect(202);

			expect(workerStatusService.drainWorker).toHaveBeenCalledWith('worker-123');
		});
	});
});
