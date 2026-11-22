import type { WorkflowSimulationService } from '@n8n/backend-module-ai-gym';
import {
	UnsupportedWorkflowNodesError,
	WorkflowSimulationService as WorkflowSimulationServiceClass,
} from '@n8n/backend-module-ai-gym';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { PostHogClient } from '@n8n/backend-services';
import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { InstanceAiWorkflowTestService } from '../instance-ai-workflow-test.service';

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return {
		id: 'wf-1',
		name: 'Test Workflow',
		active: false,
		nodes: [
			{
				id: '1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				position: [200, 0],
				parameters: {},
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			},
		],
		connections: {},
		settings: {},
		...overrides,
	} as WorkflowEntity;
}

describe('InstanceAiWorkflowTestService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		delete process.env.N8N_INSTANCE_AI_WORKFLOW_TEST_ENABLED;
	});

	it('gates availability on ai-gym module activation and PostHog flag or env var', async () => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const moduleRegistry = mock<ModuleRegistry>();
		const postHog = mock<PostHogClient>();

		const service = new InstanceAiWorkflowTestService(
			logger,
			mock<WorkflowRepository>(),
			mock<CredentialsService>(),
			postHog,
			moduleRegistry,
		);

		moduleRegistry.isActive.mockReturnValue(false);
		expect(await service.isAvailable()).toBe(false);

		moduleRegistry.isActive.mockReturnValue(true);
		postHog.getFeatureFlagForInstance.mockResolvedValue(false);
		expect(await service.isAvailable()).toBe(false);

		postHog.getFeatureFlagForInstance.mockResolvedValue(true);
		expect(await service.isAvailable()).toBe(true);

		postHog.getFeatureFlagForInstance.mockResolvedValue(false);
		process.env.N8N_INSTANCE_AI_WORKFLOW_TEST_ENABLED = 'true';
		expect(await service.isAvailable()).toBe(true);
	});

	it('stops after Stage 1 if a real credential fails validation', async () => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const workflowRepo = mock<WorkflowRepository>();
		const credentialsService = mock<CredentialsService>();
		workflowRepo.get.mockResolvedValue(makeWorkflow());
		credentialsService.testById.mockResolvedValue({ status: 'Error', message: 'invalid_auth' });

		const simSpy = vi.fn();
		vi.spyOn(Container, 'get').mockReturnValue({
			simulate: simSpy,
		} as unknown as WorkflowSimulationService);

		const service = new InstanceAiWorkflowTestService(
			logger,
			workflowRepo,
			credentialsService,
			mock<PostHogClient>(),
			mock<ModuleRegistry>(),
		);

		const result = await service.runTest({ id: 'user-1' } as User, { workflowId: 'wf-1' });
		expect(result.status).toBe('credentials_failed');
		expect(result.credentialChecks).toHaveLength(1);
		expect(result.credentialChecks[0].outcome).toBe('rejected');
		expect(simSpy).not.toHaveBeenCalled();
	});

	it('runs Stage 2 simulation when Stage 1 credentials pass and maps unsupported nodes cleanly', async () => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const workflowRepo = mock<WorkflowRepository>();
		const credentialsService = mock<CredentialsService>();
		workflowRepo.get.mockResolvedValue(makeWorkflow());
		credentialsService.testById.mockResolvedValue({ status: 'OK', message: 'Connected' });

		const simulate = vi
			.fn()
			.mockRejectedValue(
				new UnsupportedWorkflowNodesError([
					{ nodeName: 'Custom', nodeType: 'n8n-nodes-base.custom', reason: 'not supported' },
				]),
			);
		vi.spyOn(Container, 'get').mockImplementation((token) => {
			if (token === WorkflowSimulationServiceClass) {
				return { simulate } as unknown as WorkflowSimulationService;
			}
			throw new Error('Unexpected Container.get');
		});

		const service = new InstanceAiWorkflowTestService(
			logger,
			workflowRepo,
			credentialsService,
			mock<PostHogClient>(),
			mock<ModuleRegistry>(),
		);

		const result = await service.runTest({ id: 'user-1' } as User, { workflowId: 'wf-1' });
		expect(result.status).toBe('unsupported_nodes');
		expect(result.credentialChecks[0].outcome).toBe('accepted');
		expect(result.unsupportedNodes).toHaveLength(1);
		expect(simulate).toHaveBeenCalledTimes(1);
	});
});
