import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentPublishService } from '../agent-publish.service';
import { AgentPublishController } from '../agent-publish.controller';
import { AgentRunnableStateService } from '../agent-runnable-state.service';
import type { AgentValidationService } from '../agent-validation.service';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController({
	agentPublishService = mock<AgentPublishService>(),
	agentValidationService = mock<AgentValidationService>(),
	credentialsService = mock<CredentialsService>(),
}: {
	agentPublishService?: Mocked<AgentPublishService>;
	agentValidationService?: Mocked<AgentValidationService>;
	credentialsService?: Mocked<CredentialsService>;
} = {}) {
	const agentRunnableStateService = new AgentRunnableStateService(
		credentialsService,
		agentValidationService,
		agentPublishService,
	);

	return {
		controller: new AgentPublishController(agentPublishService, agentRunnableStateService),
		agentPublishService,
		agentValidationService,
	};
}

describe('AgentPublishController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentPublishController);

	const routes = getRoutesByHandlerName(AgentPublishController);

	it.each([
		['publish', 'agent:publish'],
		['unpublish', 'agent:unpublish'],
		['revertToPublished', 'agent:update'],
		['revertToVersion', 'agent:update'],
		['listVersions', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentPublishController publish history', () => {
	it('lists publish history with pagination forwarded from the query', async () => {
		const { controller, agentPublishService } = makeController();
		agentPublishService.listPublishHistory.mockResolvedValue([
			{
				versionId: 'v2',
				agentId: 'agent-1',
				createdAt: '2026-01-02T00:00:00.000Z',
				updatedAt: '2026-01-02T00:00:00.000Z',
				author: 'Ada Lovelace',
				isActive: true,
			},
		]);

		const result = await controller.listVersions(
			{ params: { projectId: 'project-1', agentId: 'agent-1' } } as never,
			undefined as never,
			'agent-1',
			{ take: 5, skip: 10 } as never,
		);

		expect(agentPublishService.listPublishHistory).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			5,
			10,
		);
		expect(result).toHaveLength(1);
		expect(result[0].isActive).toBe(true);
	});
});

describe('AgentPublishController revert to version', () => {
	it('forwards the parsed versionId to the service and returns the agent with runnable state', async () => {
		const { controller, agentPublishService, agentValidationService } = makeController();
		agentPublishService.revertToVersion.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
		} as never);
		agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });

		const result = await controller.revertToVersion(
			{
				params: { projectId: 'project-1' },
				user: { id: 'user-1' },
			} as never,
			undefined as never,
			'agent-1',
			{ versionId: 'v1' } as never,
		);

		expect(agentPublishService.revertToVersion).toHaveBeenCalledWith('agent-1', 'project-1', 'v1');
		expect(result).toEqual(
			expect.objectContaining({
				id: 'agent-1',
				isRunnable: true,
			}),
		);
	});
});
