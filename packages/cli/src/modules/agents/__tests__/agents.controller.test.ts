import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { AgentScheduleService } from '../integrations/agent-schedule.service';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentRepository } from '../repositories/agent.repository';
import { AgentsController } from '../agents.controller';
import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';

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

function makeController({
	credentialsService = mock<CredentialsService>(),
	chatIntegrationService = mock<ChatIntegrationService>(),
	agentScheduleService = mock<AgentScheduleService>(),
	agentRepository = mock<AgentRepository>(),
}: {
	credentialsService?: jest.Mocked<CredentialsService>;
	chatIntegrationService?: jest.Mocked<ChatIntegrationService>;
	agentScheduleService?: jest.Mocked<AgentScheduleService>;
	agentRepository?: jest.Mocked<AgentRepository>;
} = {}) {
	const controller = new AgentsController(
		mock<AgentsService>(),
		mock<AgentsBuilderService>(),
		credentialsService,
		chatIntegrationService,
		agentScheduleService,
		agentRepository,
		mock<AgentExecutionService>(),
		mock<ChatIntegrationRegistry>(),
	);

	return {
		controller,
		credentialsService,
		chatIntegrationService,
		agentScheduleService,
		agentRepository,
	};
}

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

	it('requires Telegram settings when connecting Telegram', async () => {
		const { controller, chatIntegrationService } = makeController();

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				undefined as never,
				'agent-1',
				{ type: 'telegram', credentialId: 'cred-telegram' },
			),
		).rejects.toThrow(BadRequestError);

		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it('persists and broadcasts Telegram settings on connect', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-telegram',
				name: 'Telegram Bot',
				type: 'telegramApi',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
			},
		]);

		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			publishedVersion: {},
			integrations: [],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const { controller } = makeController({
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});
		const settings = {
			type: 'telegram' as const,
			accessMode: 'private' as const,
			allowedUsers: ['123'],
		};

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				undefined as never,
				'agent-1',
				{ type: 'telegram', credentialId: 'cred-telegram', settings },
			),
		).resolves.toEqual({ status: 'connected' });

		expect(chatIntegrationService.connect).toHaveBeenCalledWith(
			'agent-1',
			'cred-telegram',
			'telegram',
			'user-1',
			'project-1',
			{ settings },
		);
		expect(agentRepository.save).toHaveBeenCalledWith({
			...agent,
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					credentialName: 'Telegram Bot',
					settings,
				},
			],
		});
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			'agent-1',
			'telegram',
			'cred-telegram',
			'connect',
			settings,
		);
	});

	it('returns Telegram integrations from the persisted agent entry even when the live bridge is empty', async () => {
		const settings = {
			type: 'telegram' as const,
			accessMode: 'private' as const,
			allowedUsers: ['123'],
		};
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					credentialName: 'Telegram Bot',
					settings,
				},
			],
		} as never);

		// In-memory chat-service map is transiently empty (boot / reconnect /
		// leader-takeover race). Status must still surface the integration
		// from the persisted entry, otherwise the FE trigger chip flickers.
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.getStatus.mockReturnValue({
			status: 'disconnected',
			connections: 0,
			integrations: [],
		});

		const agentScheduleService = mock<AgentScheduleService>();
		agentScheduleService.getConfig.mockReturnValue({
			active: false,
			cronExpression: '0 0 * * *',
			wakeUpPrompt: 'tick',
		});

		const { controller } = makeController({
			agentRepository,
			chatIntegrationService,
			agentScheduleService,
		});

		await expect(
			controller.integrationStatus(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({
			status: 'connected',
			integrations: [{ type: 'telegram', credentialId: 'cred-telegram', settings }],
		});
	});
});

describe('AgentsController agent resource', () => {
	it('adds runnable state to the single-agent response', async () => {
		const agentsService = mock<AgentsService>();
		agentsService.findById.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
		} as never);
		agentsService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });

		const controller = new AgentsController(
			agentsService,
			mock<AgentsBuilderService>(),
			mock<CredentialsService>(),
			mock<ChatIntegrationService>(),
			mock<AgentScheduleService>(),
			mock<AgentRepository>(),
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
		);

		const result = await controller.get(
			{
				params: { projectId: 'project-1' },
				user: { id: 'user-1' },
			} as never,
			undefined as never,
			'agent-1',
		);

		expect(result).toEqual(
			expect.objectContaining({
				id: 'agent-1',
				isRunnable: true,
			}),
		);
		expect(agentsService.validateAgentIsRunnable).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			expect.any(AgentsCredentialProvider),
		);
	});

	it('marks the single-agent response as not runnable when validation reports missing fields', async () => {
		const agentsService = mock<AgentsService>();
		agentsService.findById.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
		} as never);
		agentsService.validateAgentIsRunnable.mockResolvedValue({
			missing: ['credential'],
		});

		const controller = new AgentsController(
			agentsService,
			mock<AgentsBuilderService>(),
			mock<CredentialsService>(),
			mock<ChatIntegrationService>(),
			mock<AgentScheduleService>(),
			mock<AgentRepository>(),
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
		);

		const result = await controller.get(
			{
				params: { projectId: 'project-1' },
				user: { id: 'user-1' },
			} as never,
			undefined as never,
			'agent-1',
		);

		expect(result).toEqual(
			expect.objectContaining({
				id: 'agent-1',
				isRunnable: false,
			}),
		);
	});
});

describe('AgentsController chat message history', () => {
	function makeController() {
		const agentsService = mock<AgentsService>();
		const controller = new AgentsController(
			agentsService,
			mock<AgentsBuilderService>(),
			mock<CredentialsService>(),
			mock<ChatIntegrationService>(),
			mock<AgentScheduleService>(),
			mock<AgentRepository>(),
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
		);

		return { controller, agentsService };
	}

	it('returns conversation history from the agents service', async () => {
		const { controller, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Hi there' }],
			},
		]);

		const messages = await controller.getChatMessages({
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		} as never);

		expect(messages).toEqual([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Hi there' }],
			},
		]);
		expect(agentsService.getConversationHistory).toHaveBeenCalledWith({
			threadId: 'thread-1',
			projectId: 'project-1',
			agentId: 'agent-1',
		});
	});

	it('rejects missing conversation history', async () => {
		const { controller, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue(null);

		await expect(
			controller.getChatMessages({
				params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			} as never),
		).rejects.toThrow(NotFoundError);
	});
});
