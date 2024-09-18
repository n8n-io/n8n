import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { generateNanoId } from '@/databases/utils/generators';
import { MultiMainSetup } from '@/services/orchestration/main/multi-main-setup.ee';
import { OrchestrationService } from '@/services/orchestration.service';

import { createOwner } from './shared/db/users';
import { randomName } from './shared/random';
import type { SuperAgentTest } from './shared/types';
import { setupTestServer } from './shared/utils';
import { mockInstance } from '../shared/mocking';

describe('DebugController', () => {
	const workflowRepository = mockInstance(WorkflowRepository);
	const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

	let testServer = setupTestServer({ endpointGroups: ['debug'] });
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
		testServer.license.enable('feat:multipleMainInstances');
	});

	describe('GET /debug/multi-main-setup', () => {
		test('should return multi-main setup details', async () => {
			const workflowId = generateNanoId();
			const webhooks = [{ id: workflowId, name: randomName() }] as WorkflowEntity[];
			const triggersAndPollers = [{ id: workflowId, name: randomName() }] as WorkflowEntity[];
			const activationErrors = { [workflowId]: 'Failed to activate' };
			const instanceId = 'main-71JdWtq306epIFki';
			const leaderKey = 'some-leader-key';

			workflowRepository.findIn.mockResolvedValue(triggersAndPollers);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue(webhooks);
			activeWorkflowManager.allActiveInMemory.mockReturnValue([workflowId]);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockResolvedValue(activationErrors);

			jest.spyOn(OrchestrationService.prototype, 'instanceId', 'get').mockReturnValue(instanceId);
			jest.spyOn(MultiMainSetup.prototype, 'fetchLeaderKey').mockResolvedValue(leaderKey);
			jest.spyOn(OrchestrationService.prototype, 'isLeader', 'get').mockReturnValue(true);

			const response = await ownerAgent.get('/debug/multi-main-setup').expect(200);

			expect(response.body.data).toMatchObject({
				instanceId,
				leaderKey,
				isLeader: true,
				activeWorkflows: {
					webhooks,
					triggersAndPollers,
				},
				activationErrors,
			});
		});
	});
});
