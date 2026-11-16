import { budgetMonthKey } from '@n8n/agents';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentConfigService } from '../agent-config.service';
import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentValidationService } from '../agent-validation.service';
import { AgentsConfigController } from '../agents-config.controller';
import type { AgentsService } from '../agents.service';
import type { AgentSpendLedger } from '../budget-guardrail';
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
			mock<AgentsService>(),
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
		agentRepository.existsByIdAndProjectId.mockResolvedValue(true);
		const agentSpendLedger = mock<AgentSpendLedger>();
		agentSpendLedger.read.mockResolvedValue(12.5);
		const controller = new AgentsConfigController(
			mock<AgentConfigService>(),
			mock<AgentCustomToolsService>(),
			mock<AgentValidationService>(),
			mock<CredentialsService>(),
			agentRepository,
			mock<CollaborationService>(),
			agentSpendLedger,
			mock<AgentsService>(),
		);

		await expect(
			controller.getBudget({
				params: { projectId: 'project-1', agentId: 'agent-1' },
			} as never),
		).resolves.toEqual({ spentUsd: 12.5 });
		expect(agentSpendLedger.read).toHaveBeenCalledWith(budgetMonthKey('agent-1'));
	});
});

describe('AgentsConfigController putConfig', () => {
	const req = {
		params: { projectId: 'project-1', agentId: 'agent-1' },
		user: { id: 'user-1' },
		headers: {},
	} as never;

	it('replaces the tags after the config update when the payload carries them', async () => {
		const agentConfigService = mock<AgentConfigService>();
		agentConfigService.updateConfig.mockResolvedValue({ savedAt: '2026-11-09' } as never);
		const agentsService = mock<AgentsService>();
		const validatedTags = [
			{ id: 'tag-2', name: 'Two' },
			{ id: 'tag-1', name: 'One' },
		];
		agentsService.validateAgentTags.mockResolvedValue(validatedTags as never);
		const controller = new AgentsConfigController(
			agentConfigService,
			mock<AgentCustomToolsService>(),
			mock<AgentValidationService>(),
			mock<CredentialsService>(),
			mock<AgentRepository>(),
			mock<CollaborationService>(),
			mock<AgentSpendLedger>(),
			agentsService,
		);

		const result = await controller.putConfig(req, undefined as never, 'agent-1', {
			config: { name: 'Support Agent' },
			baseConfigHash: 'hash-1',
			tags: ['tag-2', 'tag-1'],
		} as never);

		expect(agentsService.validateAgentTags).toHaveBeenCalledWith('agent-1', 'project-1', [
			'tag-2',
			'tag-1',
		]);
		expect(agentsService.applyValidatedAgentTags).toHaveBeenCalledWith('agent-1', validatedTags);
		expect(result).toEqual({ savedAt: '2026-11-09' });
	});

	it('rejects the tag list before the config is written', async () => {
		const agentConfigService = mock<AgentConfigService>();
		const agentsService = mock<AgentsService>();
		agentsService.validateAgentTags.mockRejectedValue(new NotFoundError('Some tags not found'));

		const controller = new AgentsConfigController(
			agentConfigService,
			mock<AgentCustomToolsService>(),
			mock<AgentValidationService>(),
			mock<CredentialsService>(),
			mock<AgentRepository>(),
			mock<CollaborationService>(),
			mock<AgentSpendLedger>(),
			agentsService,
		);

		await expect(
			controller.putConfig(req, undefined as never, 'agent-1', {
				config: { name: 'Support Agent' },
				baseConfigHash: 'hash-1',
				tags: ['missing'],
			} as never),
		).rejects.toThrow('Some tags not found');
		expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
		expect(agentsService.applyValidatedAgentTags).not.toHaveBeenCalled();
	});

	it('leaves the tags alone when the payload omits them', async () => {
		const agentConfigService = mock<AgentConfigService>();
		agentConfigService.updateConfig.mockResolvedValue({ savedAt: '2026-11-09' } as never);
		const agentsService = mock<AgentsService>();
		const controller = new AgentsConfigController(
			agentConfigService,
			mock<AgentCustomToolsService>(),
			mock<AgentValidationService>(),
			mock<CredentialsService>(),
			mock<AgentRepository>(),
			mock<CollaborationService>(),
			mock<AgentSpendLedger>(),
			agentsService,
		);

		await controller.putConfig(req, undefined as never, 'agent-1', {
			config: { name: 'Support Agent' },
			baseConfigHash: 'hash-1',
		} as never);

		expect(agentsService.validateAgentTags).not.toHaveBeenCalled();
		expect(agentsService.applyValidatedAgentTags).not.toHaveBeenCalled();
	});
});
