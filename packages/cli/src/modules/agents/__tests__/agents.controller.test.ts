import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import multer from 'multer';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { SlackAppSetupService } from '../integrations/slack-app-setup.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentTaskService } from '../agent-task.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentRepository } from '../repositories/agent.repository';
import { AgentsController } from '../agents.controller';
import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';

const UNAUTHENTICATED_HANDLERS = new Set([
	// Third-party webhook callback: no req.user; per-platform signature
	// verification happens inside the platform handler.
	'handleWebhook',
	// Slack OAuth callback: no req.user; the one-time state token created
	// during authenticated setup binds the callback to a user, project, and agent.
	'handleSlackAppOAuthCallback',
]);

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	AgentsController as never,
);

const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

function makeController({
	agentsService = mock<AgentsService>(),
	credentialsService = mock<CredentialsService>(),
	chatIntegrationService = mock<ChatIntegrationService>(),
	agentRepository = mock<AgentRepository>(),
	chatIntegrationRegistry = mock<ChatIntegrationRegistry>(),
	slackAppSetupService = mock<SlackAppSetupService>(),
	agentTaskService = mock<AgentTaskService>(),
	agentKnowledgeService = mock<AgentKnowledgeService>(),
}: {
	agentsService?: jest.Mocked<AgentsService>;
	credentialsService?: jest.Mocked<CredentialsService>;
	chatIntegrationService?: jest.Mocked<ChatIntegrationService>;
	agentRepository?: jest.Mocked<AgentRepository>;
	chatIntegrationRegistry?: jest.Mocked<ChatIntegrationRegistry>;
	slackAppSetupService?: jest.Mocked<SlackAppSetupService>;
	agentTaskService?: jest.Mocked<AgentTaskService>;
	agentKnowledgeService?: jest.Mocked<AgentKnowledgeService>;
} = {}) {
	if (!chatIntegrationRegistry.require.getMockImplementation()) {
		chatIntegrationRegistry.require.mockImplementation(
			(type: string) =>
				({
					type,
					displayLabel: type,
					credentialTypes: type === 'telegram' ? ['telegramApi'] : [`${type}Api`],
				}) as never,
		);
	}

	// Default the knowledge-base module to enabled so file-endpoint tests pass;
	// the disabled-gating test overrides this on the returned mock.
	agentsService.isKnowledgeBaseModuleEnabled.mockReturnValue(true);

	const controller = new AgentsController(
		agentsService,
		mock<AgentsBuilderService>(),
		credentialsService,
		chatIntegrationService,
		agentRepository,
		mock<AgentExecutionService>(),
		chatIntegrationRegistry,
		slackAppSetupService,
		agentTaskService,
		agentKnowledgeService,
	);

	return {
		controller,
		agentsService,
		credentialsService,
		chatIntegrationService,
		agentRepository,
		chatIntegrationRegistry,
		slackAppSetupService,
		agentTaskService,
		agentKnowledgeService,
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
		['listFiles', 'agent:read'],
		['uploadFiles', 'agent:update'],
		['deleteFile', 'agent:update'],
		['revertToVersion', 'agent:update'],
		['createSlackApp', 'agent:update'],
		['getSlackAppManifest', 'agent:read'],
		['listTasks', 'agent:read'],
		['createTask', 'agent:update'],
		['updateTask', 'agent:update'],
		['deleteTask', 'agent:update'],
		['runTaskNow', 'agent:execute'],
		['listVersions', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(metadata.routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentsController tasks', () => {
	const agent = { id: 'agent-1', projectId: 'project-1' } as never;
	const req = { params: { projectId: 'project-1' } } as never;

	it('lists tasks for the agent', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const tasks = [{ id: 'task-1' }] as never;
		agentTaskService.list.mockResolvedValue(tasks);

		const result = await controller.listTasks(req, undefined as never, 'agent-1');

		expect(agentTaskService.list).toHaveBeenCalledWith('agent-1');
		expect(result).toBe(tasks);
	});

	it('404s when listing tasks for an agent outside the project', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(controller.listTasks(req, undefined as never, 'agent-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(agentTaskService.list).not.toHaveBeenCalled();
	});

	it('creates a task', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const created = { id: 'task-1' } as never;
		agentTaskService.create.mockResolvedValue(created);
		const payload = {
			name: 'Daily',
			objective: 'Do X',
			cronExpression: '0 9 * * *',
			enabled: true,
		} as never;

		const result = await controller.createTask(req, undefined as never, 'agent-1', payload);

		expect(agentTaskService.create).toHaveBeenCalledWith('agent-1', payload);
		expect(result).toBe(created);
	});

	it('updates a task', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const updated = { id: 'task-1' } as never;
		agentTaskService.update.mockResolvedValue(updated);
		const payload = { name: 'Renamed' } as never;

		const result = await controller.updateTask(
			req,
			undefined as never,
			'agent-1',
			'task-1',
			payload,
		);

		expect(agentTaskService.update).toHaveBeenCalledWith('agent-1', 'task-1', payload);
		expect(result).toBe(updated);
	});

	it('deletes a task and returns success', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await controller.deleteTask(req, undefined as never, 'agent-1', 'task-1');

		expect(agentTaskService.delete).toHaveBeenCalledWith('agent-1', 'task-1');
		expect(result).toEqual({ success: true });
	});

	it('404s when deleting a task for an agent outside the project', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(
			controller.deleteTask(req, undefined as never, 'agent-1', 'task-1'),
		).rejects.toThrow(NotFoundError);
		expect(agentTaskService.delete).not.toHaveBeenCalled();
	});

	it('runs a task now as the requesting user', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const runReq = { params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never;

		const result = await controller.runTaskNow(runReq, undefined as never, 'agent-1', 'task-1');

		expect(agentTaskService.runNow).toHaveBeenCalledWith('agent-1', 'task-1', 'user-1');
		expect(result).toEqual({ success: true });
	});

	it('404s when running a task for an agent outside the project', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		const runReq = { params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never;

		await expect(
			controller.runTaskNow(runReq, undefined as never, 'agent-1', 'task-1'),
		).rejects.toThrow(NotFoundError);
		expect(agentTaskService.runNow).not.toHaveBeenCalled();
	});
});

describe('AgentsController file uploads', () => {
	it('rejects empty uploads', async () => {
		const { controller } = makeController();

		await expect(
			controller.uploadFiles(
				{ params: { projectId: 'project-1' }, files: [] } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);
	});

	it('maps multer upload validation errors to bad requests', async () => {
		const { controller } = makeController();

		await expect(
			controller.uploadFiles(
				{
					params: { projectId: 'project-1' },
					fileUploadError: new multer.MulterError('LIMIT_FILE_COUNT'),
				} as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);
	});
});

describe('AgentsController knowledge base gating', () => {
	it('returns not found for file endpoints when the knowledge-base module is disabled', async () => {
		const { controller, agentsService } = makeController();
		agentsService.isKnowledgeBaseModuleEnabled.mockReturnValue(false);

		await expect(
			controller.listFiles(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(NotFoundError);
		await expect(
			controller.uploadFiles(
				{ params: { projectId: 'project-1' }, files: [] } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(NotFoundError);
		await expect(
			controller.deleteFile(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'project-1',
				'agent-1',
				'file-1',
			),
		).rejects.toThrow(NotFoundError);
	});
});

describe('AgentsController publish history', () => {
	it('lists publish history with pagination forwarded from the query', async () => {
		const { controller, agentsService } = makeController();
		agentsService.listPublishHistory.mockResolvedValue([
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

		expect(agentsService.listPublishHistory).toHaveBeenCalledWith('agent-1', 'project-1', 5, 10);
		expect(result).toHaveLength(1);
		expect(result[0].isActive).toBe(true);
	});
});

describe('AgentsController revert to version', () => {
	it('forwards the parsed versionId to the service and returns the agent with runnable state', async () => {
		const { controller, agentsService } = makeController();
		agentsService.revertToVersion.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
		} as never);
		agentsService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });

		const result = await controller.revertToVersion(
			{
				params: { projectId: 'project-1' },
				user: { id: 'user-1' },
			} as never,
			undefined as never,
			'agent-1',
			{ versionId: 'v1' } as never,
		);

		expect(agentsService.revertToVersion).toHaveBeenCalledWith('agent-1', 'project-1', 'v1');
		expect(result).toEqual(
			expect.objectContaining({
				id: 'agent-1',
				isRunnable: true,
			}),
		);
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
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			activeVersion: {},
			integrations: [],
		} as never);

		const controller = new AgentsController(
			mock<AgentsService>(),
			mock<AgentsBuilderService>(),
			credentialsService,
			chatIntegrationService,
			agentRepository,
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
			mock<SlackAppSetupService>(),
			mock<AgentTaskService>(),
			mock<AgentKnowledgeService>(),
		);

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-outside-project' },
				} as never,
				undefined as never,
				'agent-1',
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
					body: { type: 'telegram', credentialId: 'cred-telegram' },
				} as never,
				undefined as never,
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);

		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it('rejects credentials whose type is not supported by the chat integration', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-oauth',
				name: 'Slack OAuth',
				type: 'slackOAuth2Api',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			activeVersion: {},
			integrations: [],
		} as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
		chatIntegrationRegistry.require.mockReturnValue({
			type: 'slack',
			credentialTypes: ['slackApi'],
		} as never);

		const { controller } = makeController({
			credentialsService,
			chatIntegrationService,
			agentRepository,
			chatIntegrationRegistry,
		});

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-oauth' },
				} as never,
				undefined as never,
				'agent-1',
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
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			activeVersion: {},
			integrations: [],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const agentsService = mock<AgentsService>();
		const { controller } = makeController({
			agentsService,
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});
		const settings = {
			accessMode: 'private' as const,
			allowedUsers: ['123'],
		};

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: {
						type: 'telegram',
						credentialId: 'cred-telegram',
						settings,
					},
				} as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({ status: 'connected' });

		expect(chatIntegrationService.connect).toHaveBeenCalledWith(
			'agent-1',
			{
				type: 'telegram',
				credentialId: 'cred-telegram',
				settings,
			},
			'user-1',
			'project-1',
		);
		expect(agentsService.saveCredentialIntegration).toHaveBeenCalledWith(agent, {
			type: 'telegram',
			credentialId: 'cred-telegram',
			settings,
		});
	});

	it('persists the integration before publishing when connecting an unpublished agent', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-slack',
				name: 'Slack Bot',
				type: 'slackApi',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			publishedVersion: null,
			integrations: [],
		};
		const savedAgent = {
			...agent,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		};
		const publishedAgent = {
			...savedAgent,
			publishedVersion: {},
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const agentsService = mock<AgentsService>();
		agentsService.saveCredentialIntegration.mockResolvedValue(savedAgent as never);
		agentsService.publishAgent.mockResolvedValue(publishedAgent as never);
		agentsService.validateAgentIsRunnable.mockResolvedValue({ missing: [] } as never);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.connect.mockResolvedValue(undefined);
		chatIntegrationService.broadcastIntegrationChange.mockResolvedValue(undefined);
		const { controller } = makeController({
			agentsService,
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-slack' },
				} as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toMatchObject({
			status: 'connected',
			agent: {
				id: 'agent-1',
				publishedVersion: {},
				isRunnable: true,
			},
		});

		const integration = { type: 'slack', credentialId: 'cred-slack' };
		expect(agentsService.saveCredentialIntegration).toHaveBeenCalledWith(agent, integration, {
			broadcast: false,
		});
		expect(agentsService.publishAgent).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			{ id: 'user-1' },
			undefined,
			{ syncIntegrations: false },
		);
		expect(chatIntegrationService.connect).toHaveBeenCalledWith(
			'agent-1',
			integration,
			'user-1',
			'project-1',
		);
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			'agent-1',
			integration,
			'connect',
		);
		expect(agentsService.saveCredentialIntegration.mock.invocationCallOrder[0]).toBeLessThan(
			agentsService.publishAgent.mock.invocationCallOrder[0],
		);
		expect(agentsService.publishAgent.mock.invocationCallOrder[0]).toBeLessThan(
			chatIntegrationService.connect.mock.invocationCallOrder[0],
		);
		expect(chatIntegrationService.connect.mock.invocationCallOrder[0]).toBeLessThan(
			chatIntegrationService.broadcastIntegrationChange.mock.invocationCallOrder[0],
		);
	});

	it('does not report an unpublished agent integration as connected when live connect fails', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-slack',
				name: 'Slack Bot',
				type: 'slackApi',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			publishedVersion: null,
			integrations: [],
		};
		const savedAgent = {
			...agent,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		};
		const publishedAgent = {
			...savedAgent,
			publishedVersion: {},
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const agentsService = mock<AgentsService>();
		agentsService.saveCredentialIntegration.mockResolvedValue(savedAgent as never);
		agentsService.publishAgent.mockResolvedValue(publishedAgent as never);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.connect.mockRejectedValue(new Error('Slack connect failed'));
		const { controller } = makeController({
			agentsService,
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-slack' },
				} as never,
				undefined as never,
				'agent-1',
			),
		).rejects.toThrow('Slack connect failed');

		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('returns Telegram integrations from the persisted agent entry even when the live bridge is empty', async () => {
		const settings = {
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

		const { controller } = makeController({
			agentRepository,
			chatIntegrationService,
		});

		await expect(
			controller.integrationStatus(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({
			status: 'connected',
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					settings,
				},
			],
		});
	});

	it('starts Slack app setup with the temporary app configuration token', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		slackAppSetupService.createApp.mockResolvedValue({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});
		const { controller } = makeController({ slackAppSetupService });

		await expect(
			controller.createSlackApp(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				undefined as never,
				'agent-1',
				{ appConfigurationToken: 'xoxe-config' },
			),
		).resolves.toEqual({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});

		expect(slackAppSetupService.createApp).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user: { id: 'user-1' },
		});
	});

	it('returns the manual Slack app manifest', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		slackAppSetupService.getManualManifest.mockResolvedValue({
			manifest: {
				display_information: { name: 'Support Agent' },
				features: {
					app_home: {
						home_tab_enabled: true,
						messages_tab_enabled: true,
						messages_tab_read_only_enabled: false,
					},
					bot_user: {
						display_name: 'Support Agent',
						always_online: true,
					},
				},
				oauth_config: {
					scopes: { bot: ['chat:write'] },
				},
				settings: {
					event_subscriptions: {
						request_url:
							'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
						bot_events: ['app_mention'],
					},
					interactivity: {
						is_enabled: true,
						request_url:
							'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
					},
					org_deploy_enabled: false,
					socket_mode_enabled: false,
					token_rotation_enabled: false,
				},
			},
		});
		const { controller } = makeController({ slackAppSetupService });

		await expect(
			controller.getSlackAppManifest(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({
			manifest: expect.objectContaining({
				display_information: { name: 'Support Agent' },
				oauth_config: {
					scopes: { bot: ['chat:write'] },
				},
			}),
		});

		expect(slackAppSetupService.getManualManifest).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
		});
	});

	it('completes Slack app setup from the OAuth callback and renders the success template', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		const { controller } = makeController({ slackAppSetupService });
		const res = { render: jest.fn() };

		await controller.handleSlackAppOAuthCallback(
			{
				params: { projectId: 'project-1' },
				query: { code: 'slack-code', state: 'setup-state' },
			} as never,
			res as never,
			'agent-1',
		);

		expect(slackAppSetupService.completeInstall).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
			code: 'slack-code',
			state: 'setup-state',
		});
		expect(res.render).toHaveBeenCalledWith('oauth-callback');
	});

	it('renders the Slack OAuth error callback when Slack denies setup', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		const { controller } = makeController({ slackAppSetupService });
		const res = { render: jest.fn() };

		await controller.handleSlackAppOAuthCallback(
			{
				params: { projectId: 'project-1' },
				query: { error: 'access_denied', error_description: 'User denied install' },
			} as never,
			res as never,
			'agent-1',
		);

		expect(slackAppSetupService.completeInstall).not.toHaveBeenCalled();
		expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
			error: {
				message: 'access_denied',
				reason: 'User denied install',
			},
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
			mock<AgentRepository>(),
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
			mock<SlackAppSetupService>(),
			mock<AgentTaskService>(),
			mock<AgentKnowledgeService>(),
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
			mock<AgentRepository>(),
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
			mock<SlackAppSetupService>(),
			mock<AgentTaskService>(),
			mock<AgentKnowledgeService>(),
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
			mock<AgentRepository>(),
			mock<AgentExecutionService>(),
			mock<ChatIntegrationRegistry>(),
			mock<SlackAppSetupService>(),
			mock<AgentTaskService>(),
			mock<AgentKnowledgeService>(),
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
