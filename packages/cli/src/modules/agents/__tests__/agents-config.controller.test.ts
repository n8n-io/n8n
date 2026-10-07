import { budgetMonthKey, type SpendLedger } from '@n8n/agents';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentConfigService } from '../agent-config.service';
import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentValidationService } from '../agent-validation.service';
import { AgentsConfigController } from '../agents-config.controller';
import type { AgentSpendLedger } from '../budget-guardrail';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SkillHubService } from '../skills-hub/skill-hub.service';
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
		['getBudget', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentsConfigController getValidation', () => {
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
			mock<CollaborationService>(),
			mock<AgentSpendLedger>(),
			mock<SkillHubService>(),
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

describe('AgentsConfigController getBudget', () => {
	it('returns the ledger total for the current month key', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: 'agent-1' } as never);
		const read = vi.fn<SpendLedger['read']>().mockResolvedValue(12.5);
		const agentSpendLedger = {
			ledger: {
				read,
				add: vi.fn<SpendLedger['add']>(),
			},
		};
		const controller = new AgentsConfigController(
			mock<AgentConfigService>(),
			mock<AgentCustomToolsService>(),
			mock<AgentValidationService>(),
			mock<CredentialsService>(),
			agentRepository,
			mock<CollaborationService>(),
			agentSpendLedger,
			mock<SkillHubService>(),
		);

		await expect(
			controller.getBudget({
				params: { projectId: 'project-1', agentId: 'agent-1' },
			} as never),
		).resolves.toEqual({ spentUsd: 12.5 });
		expect(read).toHaveBeenCalledWith(budgetMonthKey('agent-1'));
	});
});
