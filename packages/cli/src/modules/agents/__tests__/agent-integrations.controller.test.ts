/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentIntegrationManagementService } from '../agent-integration-management.service';
import { AgentIntegrationsController } from '../agent-integrations.controller';
import type { Agent } from '../entities/agent.entity';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentRepository } from '../repositories/agent.repository';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

const UNAUTHENTICATED_HANDLERS = new Set(['handleWebhook']);

function makeController({
	managementService = mock<AgentIntegrationManagementService>(),
	chatIntegrationService = mock<ChatIntegrationService>(),
	agentRepository = mock<AgentRepository>(),
	chatIntegrationRegistry = mock<ChatIntegrationRegistry>(),
}: {
	managementService?: Mocked<AgentIntegrationManagementService>;
	chatIntegrationService?: Mocked<ChatIntegrationService>;
	agentRepository?: Mocked<AgentRepository>;
	chatIntegrationRegistry?: Mocked<ChatIntegrationRegistry>;
} = {}) {
	return {
		controller: new AgentIntegrationsController(
			managementService,
			chatIntegrationService,
			agentRepository,
			chatIntegrationRegistry,
		),
		managementService,
		chatIntegrationService,
		agentRepository,
	};
}

describe('AgentIntegrationsController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentIntegrationsController, UNAUTHENTICATED_HANDLERS);

	const routes = getRoutesByHandlerName(AgentIntegrationsController);

	it.each([
		['connectIntegration', 'agent:update'],
		['disconnectIntegration', 'agent:update'],
		['integrationStatus', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentIntegrationsController integration management', () => {
	const user = { id: 'user-1' };
	const agent = {
		id: 'agent-1',
		projectId: 'project-1',
		activeVersionId: 'version-1',
		integrations: [],
	} as unknown as Agent;

	it('delegates a connect and reports connected for a published agent', async () => {
		const { controller, managementService, agentRepository } = makeController();
		const integration = {
			type: 'slack',
			credentialId: 'credential-1',
		} satisfies AgentIntegrationConfig;
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		managementService.connect.mockResolvedValue({ integration, savedAgent: agent });

		const result = await controller.connectIntegration(
			{
				params: { projectId: agent.projectId },
				user,
				body: integration,
			} as never,
			undefined as never,
			agent.id,
			integration as never,
		);

		expect(managementService.validateConfig).toHaveBeenCalledWith(integration);
		expect(managementService.connect).toHaveBeenCalledWith({
			agent,
			user,
			integration,
		});
		expect(result).toEqual({ status: 'connected' });
	});

	it('forwards a replacement so the swap happens in one operation', async () => {
		const { controller, managementService, agentRepository } = makeController();
		const integration = {
			type: 'slack',
			credentialId: 'credential-1',
		} satisfies AgentIntegrationConfig;
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		managementService.connect.mockResolvedValue({ integration, savedAgent: agent });

		await controller.connectIntegration(
			{
				params: { projectId: agent.projectId },
				user,
				body: { ...integration, replaces: { credentialId: 'credential-0' } },
			} as never,
			undefined as never,
			agent.id,
			{ ...integration, replaces: { credentialId: 'credential-0' } } as never,
		);

		expect(managementService.connect).toHaveBeenCalledWith({
			agent,
			user,
			integration: { ...integration, replaces: { credentialId: 'credential-0' } },
			replaces: { type: 'slack', credentialId: 'credential-0' },
		});
	});

	it('passes platform settings through the envelope untouched', async () => {
		const { controller, managementService, agentRepository } = makeController();
		const integration = {
			type: 'telegram',
			credentialId: 'credential-1',
			settings: { accessMode: 'private', allowedUsers: ['@alice'] },
		} satisfies AgentIntegrationConfig;
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		managementService.connect.mockResolvedValue({ integration, savedAgent: agent });

		await controller.connectIntegration(
			{
				params: { projectId: agent.projectId },
				user,
				body: integration,
			} as never,
			undefined as never,
			agent.id,
			integration as never,
		);

		expect(managementService.connect).toHaveBeenCalledWith({ agent, user, integration });
	});

	it('reports configured when the saved agent is unpublished', async () => {
		const { controller, managementService, agentRepository } = makeController();
		const integration = {
			type: 'slack',
			credentialId: 'credential-1',
		} satisfies AgentIntegrationConfig;
		const draftAgent = { ...agent, activeVersionId: null } as Agent;
		agentRepository.findByIdAndProjectId.mockResolvedValue(draftAgent);
		managementService.connect.mockResolvedValue({
			integration,
			savedAgent: draftAgent,
		});

		const result = await controller.connectIntegration(
			{
				params: { projectId: agent.projectId },
				user,
				body: integration,
			} as never,
			undefined as never,
			agent.id,
			integration as never,
		);

		expect(result).toEqual({ status: 'configured' });
	});

	it('delegates disconnect without platform-specific cleanup', async () => {
		const { controller, managementService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		managementService.disconnect.mockResolvedValue({ savedAgent: agent });

		const result = await controller.disconnectIntegration(
			{
				params: { projectId: agent.projectId },
				user,
			} as never,
			undefined as never,
			agent.id,
			{ type: 'slack', credentialId: 'credential-1' },
		);

		expect(managementService.disconnect).toHaveBeenCalledWith({
			agent,
			user,
			type: 'slack',
			credentialId: 'credential-1',
		});
		expect(result).toEqual({ status: 'disconnected' });
	});

	it('returns a platform webhook rejection without looking up a handler', async () => {
		const chatIntegrationService = mock<ChatIntegrationService>();
		const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
		chatIntegrationRegistry.get.mockReturnValue({
			resolveWebhookRequest: () => ({
				type: 'reject',
				response: { status: 404, body: { error: 'Not found' } },
			}),
		} as never);
		const { controller } = makeController({ chatIntegrationService, chatIntegrationRegistry });
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};

		await controller.handleWebhook(
			{
				params: { projectId: 'project-1', agentId: 'agent-1', platform: 'discord' },
				headers: { 'x-discord-gateway-token': 'some-token' },
			} as never,
			res as never,
		);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
		expect(chatIntegrationService.getWebhookHandler).not.toHaveBeenCalled();
	});

	it('passes the platform connection selector to getWebhookHandler', async () => {
		const chatIntegrationService = mock<ChatIntegrationService>();
		const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
		chatIntegrationService.getWebhookHandler.mockReturnValue(handler);
		const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
		chatIntegrationRegistry.get.mockReturnValue({
			resolveWebhookRequest: () => ({ type: 'select', connectionSelector: 'app-b' }),
		} as never);
		const { controller } = makeController({ chatIntegrationService, chatIntegrationRegistry });
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
			setHeader: vi.fn(),
			send: vi.fn(),
		};

		await controller.handleWebhook(
			{
				params: { projectId: 'project-1', agentId: 'agent-1', platform: 'discord' },
				headers: { host: 'localhost', 'content-type': 'application/json' },
				method: 'POST',
				protocol: 'https',
				originalUrl: '/rest/projects/project-1/agents/v2/agent-1/webhooks/discord',
				body: { application_id: 'app-b', type: 1 },
			} as never,
			res as never,
		);

		expect(chatIntegrationService.getWebhookHandler).toHaveBeenCalledWith(
			'agent-1',
			'discord',
			'app-b',
		);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(res.status).toHaveBeenCalledWith(200);
	});

	it('does not look up a handler when the platform reports no match', async () => {
		const chatIntegrationService = mock<ChatIntegrationService>();
		const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
		chatIntegrationRegistry.get.mockReturnValue({
			resolveWebhookRequest: () => ({ type: 'no_match' }),
		} as never);
		const { controller } = makeController({ chatIntegrationService, chatIntegrationRegistry });
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};

		await controller.handleWebhook(
			{
				params: { projectId: 'project-1', agentId: 'agent-1', platform: 'discord' },
				headers: {},
				body: { type: 1 },
			} as never,
			res as never,
		);

		expect(chatIntegrationService.getWebhookHandler).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			error: 'No active discord integration for agent "agent-1"',
		});
	});

	it('returns 404 when the selected connection has no handler', async () => {
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getWebhookHandler.mockReturnValue(undefined);
		const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
		chatIntegrationRegistry.get.mockReturnValue({
			resolveWebhookRequest: () => ({
				type: 'select',
				connectionSelector: 'app-unknown',
			}),
		} as never);
		const { controller } = makeController({ chatIntegrationService, chatIntegrationRegistry });
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};

		await controller.handleWebhook(
			{
				params: { projectId: 'project-1', agentId: 'agent-1', platform: 'discord' },
				headers: {},
				body: { application_id: 'app-unknown', type: 1 },
			} as never,
			res as never,
		);

		expect(chatIntegrationService.getWebhookHandler).toHaveBeenCalledWith(
			'agent-1',
			'discord',
			'app-unknown',
		);
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			error: 'No active discord integration for agent "agent-1"',
		});
	});
});
