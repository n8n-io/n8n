import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { AgentScheduleService } from '../integrations/agent-schedule.service';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentRepository } from '../repositories/agent.repository';
import { AgentsController } from '../agents.controller';

// The webhook route is the single exception: it is `skipAuth: true` (no
// req.user) and authenticates inbound third-party callbacks via per-platform
// signature verification inside the handler.
const UNAUTHENTICATED_HANDLERS = new Set(['handleWebhook']);

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	AgentsController as never,
);

const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

describe('AgentsController route access scopes', () => {
	it.each(routeCases)(
		'$handlerName is gated by a project-scoped agent:* check',
		({ handlerName, route }) => {
			if (UNAUTHENTICATED_HANDLERS.has(handlerName)) {
				expect(route.accessScope).toBeUndefined();
				expect(route.skipAuth).toBe(true);
				return;
			}

			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('agent:')).toBe(true);
		},
	);

	it.each([
		['listSkills', 'agent:read'],
		['getSkill', 'agent:read'],
		['createSkill', 'agent:update'],
		['updateSkill', 'agent:update'],
		['deleteSkill', 'agent:update'],
		['revertToPublished', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(metadata.routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentsController integration credentials', () => {
	it('lists credentials through the workflow-scoped user project resolver', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-allowed',
				name: 'Allowed Slack',
				type: 'slackApi',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
			},
		]);

		const controller = new AgentsController(
			mock<AgentsService>(),
			mock<AgentsBuilderService>(),
			credentialsService,
			mock<ChatIntegrationService>(),
			mock<AgentScheduleService>(),
			mock<AgentRepository>(),
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
		);

		await expect(
			controller.listCredentials({
				params: { projectId: 'project-1', agentId: 'agent-1' },
				user: { id: 'user-1' },
			} as never),
		).resolves.toEqual([{ id: 'cred-allowed', name: 'Allowed Slack', type: 'slackApi' }]);

		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(
			{ id: 'user-1' },
			{ projectId: 'project-1' },
		);
		expect(credentialsService.findAllCredentialIdsForProject).not.toHaveBeenCalled();
	});

	it('rejects credentials that are not usable in the agent project', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-allowed',
				name: 'Allowed Slack',
				type: 'slackApi',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
			},
		]);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			publishedVersion: {},
			integrations: [],
		} as never);

		const controller = new AgentsController(
			mock<AgentsService>(),
			mock<AgentsBuilderService>(),
			credentialsService,
			chatIntegrationService,
			mock<AgentScheduleService>(),
			agentRepository,
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
		);

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				undefined as never,
				'agent-1',
				{ type: 'slack', credentialId: 'cred-outside-project' },
			),
		).rejects.toThrow(NotFoundError);

		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(
			{ id: 'user-1' },
			{ projectId: 'project-1' },
		);
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});
});
