import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';
import type { AgentConfigService } from '../agent-config.service';
import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentValidationService } from '../agent-validation.service';
import { AgentsConfigController } from '../agents-config.controller';
import type { AgentRepository } from '../repositories/agent.repository';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentsConfigController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentsConfigController);

	const routes = getRoutesByHandlerName(AgentsConfigController);

	it.each([
		['getConfig', 'agent:read'],
		['putConfig', 'agent:update'],
		['deleteTool', 'agent:update'],
		['getValidation', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentsConfigController getValidation', () => {
	it('validates against the user-scoped credential provider and returns the result', async () => {
		const agentValidationService = mock<AgentValidationService>();
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
		});
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
		} as never);
		const controller = new AgentsConfigController(
			mock<AgentConfigService>(),
			mock<AgentCustomToolsService>(),
			agentValidationService,
			mock<CredentialsService>(),
			agentRepository,
		);

		const result = await controller.getValidation({
			params: { projectId: 'project-1', agentId: 'agent-1' },
			user: { id: 'user-1' },
		} as never);

		expect(result).toEqual({
			status: 'invalid',
			issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
		});
		expect(agentValidationService.validateLoadedAgentConfiguration).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'agent-1' }),
			'project-1',
			expect.any(AgentsCredentialProvider),
		);
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();
		expect(agentRepository.findByIdAndProjectId).toHaveBeenCalledTimes(1);
	});

	it('returns not found for validation when the agent is outside the project scope', async () => {
		const agentValidationService = mock<AgentValidationService>();
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		const controller = new AgentsConfigController(
			mock<AgentConfigService>(),
			mock<AgentCustomToolsService>(),
			agentValidationService,
			mock<CredentialsService>(),
			agentRepository,
		);

		await expect(
			controller.getValidation({
				params: { projectId: 'project-1', agentId: 'agent-1' },
				user: { id: 'user-1' },
			} as never),
		).rejects.toThrow('Agent not found');
		expect(agentValidationService.validateLoadedAgentConfiguration).not.toHaveBeenCalled();
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();
	});
});
