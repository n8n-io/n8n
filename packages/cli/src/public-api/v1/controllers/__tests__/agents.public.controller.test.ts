import type { AgentDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ConflictError, NotFoundError, UserError } from '@n8n/errors';
import type { AgentConfigService } from '@/modules/agents/agent-config.service';
import type { AgentCustomToolsService } from '@/modules/agents/agent-custom-tools.service';
import type { AgentPublicRunService } from '@/modules/agents/agent-public-run.service';
import type { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import type { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { toAgentPublicDto, type AgentResponseMapper } from '@/modules/agents/agent-response.mapper';
import type { AgentsService, DeletedAgentSnapshot } from '@/modules/agents/agents.service';

import { AgentsPublicController } from '../agents.public.controller';

describe('AgentsPublicController route metadata', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AgentsPublicController as never,
	);
	const routes = new Map(metadata.routes);

	it('registers the public agent routes', () => {
		expect([...routes.keys()].sort()).toEqual([
			'archiveAgent',
			'createAgent',
			'deleteAgent',
			'getAgent',
			'getAgentVersion',
			'listAgentExecutions',
			'listAgentVersions',
			'listAgents',
			'publishAgent',
			'runAgent',
			'stopAgentExecution',
			'unarchiveAgent',
			'unpublishAgent',
			'updateAgent',
		]);
	});

	it('createAgent requires the agent:create API key scope and no path-param RBAC check', () => {
		// `projectId` comes from the body, so RBAC runs inside
		// `AgentsService.resolveOwningProjectId`, not via `@ProjectScope`.
		expect(routes.get('createAgent')?.apiKeyScope).toBe('agent:create');
		expect(routes.get('createAgent')?.accessScope).toBeUndefined();
	});

	it('createAgent answers 201 with the created agent DTO', () => {
		const route = routes.get('createAgent');
		expect(route?.successStatus).toBe(201);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
	});

	it('deleteAgent requires the agent:delete API key scope', () => {
		expect(routes.get('deleteAgent')?.apiKeyScope).toBe('agent:delete');
		expect(routes.get('deleteAgent')?.accessScope).toEqual({
			scope: 'agent:delete',
			globalOnly: false,
		});
	});

	it('deleteAgent answers 200 with the deleted agent DTO', () => {
		const route = routes.get('deleteAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
	});

	it('archiveAgent requires the agent:delete API key scope and project RBAC check', () => {
		expect(routes.get('archiveAgent')?.apiKeyScope).toBe('agent:delete');
		expect(routes.get('archiveAgent')?.accessScope).toEqual({
			scope: 'agent:delete',
			globalOnly: false,
		});
	});

	it('archiveAgent answers 200 with the public agent DTO and does not declare 400', () => {
		const route = routes.get('archiveAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
		expect(route?.errorResponses?.some((response) => response.status === 400)).toBe(false);
	});

	it('unarchiveAgent requires the agent:delete API key scope and project RBAC check', () => {
		expect(routes.get('unarchiveAgent')?.apiKeyScope).toBe('agent:delete');
		expect(routes.get('unarchiveAgent')?.accessScope).toEqual({
			scope: 'agent:delete',
			globalOnly: false,
		});
	});

	it('unarchiveAgent answers 200 and declares 400 and 404', () => {
		const route = routes.get('unarchiveAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
		expect(route?.errorResponses?.some((response) => response.status === 400)).toBe(true);
	});

	it('getAgent requires the agent:read API key scope and project RBAC check', () => {
		expect(routes.get('getAgent')?.apiKeyScope).toBe('agent:read');
		expect(routes.get('getAgent')?.accessScope).toEqual({
			scope: 'agent:read',
			globalOnly: false,
		});
	});

	it('getAgent answers 200 with the public agent DTO', () => {
		const route = routes.get('getAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
	});

	it('listAgentVersions requires the agent:read API key scope and project RBAC check', () => {
		expect(routes.get('listAgentVersions')?.apiKeyScope).toBe('agent:read');
		expect(routes.get('listAgentVersions')?.accessScope).toEqual({
			scope: 'agent:read',
			globalOnly: false,
		});
	});

	it('getAgentVersion requires the agent:read API key scope and project RBAC check', () => {
		expect(routes.get('getAgentVersion')?.apiKeyScope).toBe('agent:read');
		expect(routes.get('getAgentVersion')?.accessScope).toEqual({
			scope: 'agent:read',
			globalOnly: false,
		});
	});

	it('listAgents requires the agent:list API key scope and no path-param RBAC check', () => {
		// Cross-project list: `AgentsService` enforces the per-project scope,
		// the same reasoning as the internal agents list route.
		expect(routes.get('listAgents')?.apiKeyScope).toBe('agent:list');
		expect(routes.get('listAgents')?.accessScope).toBeUndefined();
	});

	it('listAgents answers 200 with the agent list DTO', () => {
		const route = routes.get('listAgents');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
	});

	it('runAgent requires the agent:execute API key scope and project RBAC check', () => {
		expect(routes.get('runAgent')?.apiKeyScope).toBe('agent:execute');
		expect(routes.get('runAgent')?.accessScope).toEqual({
			scope: 'agent:execute',
			globalOnly: false,
		});
	});

	it('updateAgent requires the agent:update API key scope and project RBAC check', () => {
		expect(routes.get('updateAgent')?.apiKeyScope).toBe('agent:update');
		expect(routes.get('updateAgent')?.accessScope).toEqual({
			scope: 'agent:update',
			globalOnly: false,
		});
	});

	it('runAgent answers 200 and documents 404 and 422', () => {
		const route = routes.get('runAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.map((response) => response.status)).toEqual(
			expect.arrayContaining([404, 422]),
		);
	});

	it('stopAgentExecution requires the agent:execute API key scope and project RBAC check', () => {
		expect(routes.get('stopAgentExecution')?.apiKeyScope).toBe('agent:execute');
		expect(routes.get('stopAgentExecution')?.accessScope).toEqual({
			scope: 'agent:execute',
			globalOnly: false,
		});
		expect(routes.get('stopAgentExecution')?.successStatus).toBe(200);
		expect(
			routes.get('stopAgentExecution')?.errorResponses?.some((response) => response.status === 404),
		).toBe(true);
	});

	it('updateAgent answers 200 with the public agent DTO and declares the conflict', () => {
		const route = routes.get('updateAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
		expect(route?.errorResponses?.some((response) => response.status === 409)).toBe(true);
	});

	it('listAgentExecutions requires the agent:read API key scope and project RBAC check', () => {
		expect(routes.get('listAgentExecutions')?.apiKeyScope).toBe('agent:read');
		expect(routes.get('listAgentExecutions')?.accessScope).toEqual({
			scope: 'agent:read',
			globalOnly: false,
		});
		expect(routes.get('listAgentExecutions')?.successStatus).toBe(200);
		expect(
			routes
				.get('listAgentExecutions')
				?.errorResponses?.some((response) => response.status === 404),
		).toBe(true);
	});

	it('publishAgent requires the agent:publish API key scope and project RBAC check', () => {
		expect(routes.get('publishAgent')?.apiKeyScope).toBe('agent:publish');
		expect(routes.get('publishAgent')?.accessScope).toEqual({
			scope: 'agent:publish',
			globalOnly: false,
		});
	});

	it('publishAgent answers 200 and declares not-found, conflict, and unprocessable responses', () => {
		const route = routes.get('publishAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
		expect(route?.errorResponses?.some((response) => response.status === 409)).toBe(true);
		expect(route?.errorResponses?.some((response) => response.status === 422)).toBe(true);
	});

	it('unpublishAgent requires the agent:unpublish API key scope and project RBAC check', () => {
		expect(routes.get('unpublishAgent')?.apiKeyScope).toBe('agent:unpublish');
		expect(routes.get('unpublishAgent')?.accessScope).toEqual({
			scope: 'agent:unpublish',
			globalOnly: false,
		});
	});

	it('unpublishAgent answers 200 and declares not-found and conflict responses', () => {
		const route = routes.get('unpublishAgent');
		expect(route?.successStatus).toBe(200);
		expect(route?.responseDto).toBeDefined();
		expect(route?.errorResponses?.some((response) => response.status === 404)).toBe(true);
		expect(route?.errorResponses?.some((response) => response.status === 409)).toBe(true);
	});
});

const fullAgentDto = {
	id: 'agent-1',
	name: 'My Agent',
	projectId: 'project-1',
	project: null,
	availableInMCP: false,
	isArchived: false,
	versionId: 'version-1',
	activeVersionId: null,
	createdAt: '2025-01-02T03:04:05.000Z',
	updatedAt: '2025-06-07T08:09:10.000Z',
	config: { name: 'My Agent', model: '', instructions: '' },
	configHash: 'hash-1',
	tools: {},
	activeVersion: null,
	// Builder state: stripped from the public response.
	isRunnable: true,
	hasPublishHistory: false,
	hasVersionHistory: false,
	skills: {},
	skillHashes: {},
	outdatedSkillIds: [],
	skillVersions: {},
} as unknown as AgentDto;

describe('AgentsPublicController createAgent', () => {
	const agentsService = mock<AgentsService>();
	const agentResponseMapper = mock<AgentResponseMapper>();
	const agentDefaultModelResolverService = mock<AgentDefaultModelResolverService>();
	const agentCustomToolsService = mock<AgentCustomToolsService>();
	const controller = new AgentsPublicController(
		agentsService,
		agentResponseMapper,
		agentDefaultModelResolverService,
		agentCustomToolsService,
		mock<AgentPublicRunService>(),
		mock<AgentConfigService>(),
		mock<AgentPublishService>(),
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	function mockSuccessfulCreate() {
		agentsService.resolveOwningProjectId.mockResolvedValue('project-1');
		agentsService.createOrAdopt.mockResolvedValue({ agent: {} } as never);
		agentResponseMapper.toPublicDto.mockResolvedValue(toAgentPublicDto(fullAgentDto));
	}

	it('creates the agent in the resolved project and returns the public DTO', async () => {
		mockSuccessfulCreate();

		const result = await controller.createAgent(req, res, { name: 'My Agent' });

		expect(agentsService.resolveOwningProjectId).toHaveBeenCalledWith(req.user, undefined);
		expect(agentsService.createOrAdopt).toHaveBeenCalledWith(
			'project-1',
			'My Agent',
			expect.objectContaining({
				actor: { kind: 'user', user: req.user },
				user: req.user,
				createdBy: 'user',
			}),
		);
		expect(agentResponseMapper.toPublicDto).toHaveBeenCalledWith({}, 'project-1', req.user);
		expect(result).toEqual({
			id: 'agent-1',
			name: 'My Agent',
			projectId: 'project-1',
			project: null,
			parentFolder: null,
			availableInMCP: false,
			isArchived: false,
			versionId: 'version-1',
			activeVersionId: null,
			createdAt: '2025-01-02T03:04:05.000Z',
			updatedAt: '2025-06-07T08:09:10.000Z',
			config: { name: 'My Agent', model: '', instructions: '' },
			configHash: 'hash-1',
			tools: {},
			activeVersion: null,
		});
	});

	it('resolves the target project from the body projectId', async () => {
		mockSuccessfulCreate();

		await controller.createAgent(req, res, { name: 'My Agent', projectId: 'project-2' });

		expect(agentsService.resolveOwningProjectId).toHaveBeenCalledWith(req.user, 'project-2');
	});

	it('seeds the default model only when the config has no model', async () => {
		mockSuccessfulCreate();
		agentDefaultModelResolverService.resolve.mockResolvedValue({
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'credential-1',
		});

		await controller.createAgent(req, res, { name: 'No model' });
		expect(agentDefaultModelResolverService.resolve).toHaveBeenCalledWith(req.user, 'project-1');
		expect(agentsService.createOrAdopt).toHaveBeenCalledWith(
			'project-1',
			'No model',
			expect.objectContaining({
				defaultModel: { model: 'anthropic/claude-sonnet-4-5', credential: 'credential-1' },
			}),
		);

		agentsService.createOrAdopt.mockClear();
		agentDefaultModelResolverService.resolve.mockClear();

		await controller.createAgent(req, res, {
			name: 'With model',
			config: { name: 'With model', model: 'openai/gpt-5', instructions: '' },
		});
		expect(agentDefaultModelResolverService.resolve).not.toHaveBeenCalled();
		expect(agentsService.createOrAdopt).not.toHaveBeenCalledWith(
			'project-1',
			'With model',
			expect.objectContaining({ defaultModel: expect.anything() }),
		);
	});

	it('passes config, tools, and MCP availability through', async () => {
		mockSuccessfulCreate();

		const body = {
			name: 'Configured',
			projectId: 'project-1',
			config: { name: 'Configured', model: 'openai/gpt-5', instructions: 'Help' },
			tools: { myTool: { code: 'return []', descriptor: { name: 'myTool' } } },
			availableInMCP: true,
		};
		await controller.createAgent(req, res, body);

		expect(agentCustomToolsService.validateDescriptor).toHaveBeenCalledWith(
			body.tools.myTool.descriptor,
		);
		expect(agentsService.createOrAdopt).toHaveBeenCalledWith(
			'project-1',
			'Configured',
			expect.objectContaining({
				config: body.config,
				tools: body.tools,
				availableInMCP: true,
			}),
		);
	});

	it('rejects a custom tool name the custom-tool write path would reject', async () => {
		mockSuccessfulCreate();
		agentCustomToolsService.validateDescriptor.mockImplementation(() => {
			throw new UserError(
				'Custom tool name "my-tool" contains invalid characters. Only letters, numbers, and underscores are allowed.',
			);
		});

		await expect(
			controller.createAgent(req, res, {
				name: 'Bad tool name',
				tools: { 'my-tool': { code: 'return []', descriptor: { name: 'my-tool' } } },
			}),
		).rejects.toThrow(UserError);

		expect(agentsService.createOrAdopt).not.toHaveBeenCalled();
	});
});

describe('AgentsPublicController getAgent', () => {
	const agentsService = mock<AgentsService>();
	const agentResponseMapper = mock<AgentResponseMapper>();
	const controller = new AgentsPublicController(
		agentsService,
		agentResponseMapper,
		mock<AgentDefaultModelResolverService>(),
		mock<AgentCustomToolsService>(),
		mock<AgentPublicRunService>(),
		mock<AgentConfigService>(),
		mock<AgentPublishService>(),
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	it('resolves the agent by ID alone and returns the public DTO without builder state', async () => {
		agentsService.findById.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
		} as unknown as Awaited<ReturnType<AgentsService['findById']>>);
		agentResponseMapper.toPublicDto.mockResolvedValue(toAgentPublicDto(fullAgentDto));

		const result = await controller.getAgent(req, res, 'agent-1');

		expect(agentsService.findById).toHaveBeenCalledWith('agent-1');
		expect(agentResponseMapper.toPublicDto).toHaveBeenCalledWith(
			{ id: 'agent-1', projectId: 'project-1' },
			'project-1',
			req.user,
		);
		expect(result).toEqual({
			id: 'agent-1',
			name: 'My Agent',
			projectId: 'project-1',
			project: null,
			parentFolder: null,
			availableInMCP: false,
			isArchived: false,
			versionId: 'version-1',
			activeVersionId: null,
			createdAt: '2025-01-02T03:04:05.000Z',
			updatedAt: '2025-06-07T08:09:10.000Z',
			config: { name: 'My Agent', model: '', instructions: '' },
			configHash: 'hash-1',
			tools: {},
			activeVersion: null,
		});
	});

	it('answers 404 when the agent does not exist', async () => {
		agentsService.findById.mockResolvedValue(null);

		await expect(controller.getAgent(req, res, 'missing-agent')).rejects.toThrow(NotFoundError);
	});
});

describe('AgentsPublicController listAgents', () => {
	const agentsService = mock<AgentsService>();
	const agentResponseMapper = mock<AgentResponseMapper>();
	const controller = new AgentsPublicController(
		agentsService,
		agentResponseMapper,
		mock<AgentDefaultModelResolverService>(),
		mock<AgentCustomToolsService>(),
		mock<AgentPublicRunService>(),
		mock<AgentConfigService>(),
		mock<AgentPublishService>(),
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	const agentRows = [
		{
			id: 'agent-1',
			name: 'First',
			projectId: 'project-1',
			availableInMCP: true,
			isArchived: false,
			versionId: null,
			activeVersionId: 'version-1',
			createdAt: new Date('2025-01-02T03:04:05Z'),
			updatedAt: new Date('2025-06-07T08:09:10Z'),
		},
		{
			id: 'agent-2',
			name: null,
			projectId: 'project-2',
			availableInMCP: undefined,
			isArchived: true,
			versionId: 'version-2',
			activeVersionId: null,
			createdAt: new Date('2025-02-03T04:05:06Z'),
			updatedAt: new Date('2025-07-08T09:10:11Z'),
		},
	] as unknown as Awaited<ReturnType<AgentsService['findListableByUserPaginated']>>['data'];

	it('returns one cursor page of lean rows', async () => {
		agentsService.findListableByUserPaginated.mockResolvedValue({ count: 2, data: agentRows });

		const result = await controller.listAgents(req, res, { limit: 2 });

		expect(agentsService.findListableByUserPaginated).toHaveBeenCalledWith(req.user, {
			offset: 0,
			limit: 2,
			filter: {},
		});
		expect(result.nextCursor).toBeNull();
		expect(result.data).toEqual([
			{
				id: 'agent-1',
				name: 'First',
				projectId: 'project-1',
				availableInMCP: true,
				isArchived: false,
				versionId: null,
				activeVersionId: 'version-1',
				createdAt: '2025-01-02T03:04:05.000Z',
				updatedAt: '2025-06-07T08:09:10.000Z',
			},
			{
				id: 'agent-2',
				name: '',
				projectId: 'project-2',
				availableInMCP: false,
				isArchived: true,
				versionId: 'version-2',
				activeVersionId: null,
				createdAt: '2025-02-03T04:05:06.000Z',
				updatedAt: '2025-07-08T09:10:11.000Z',
			},
		]);
	});

	it('encodes the next page into nextCursor when more rows follow', async () => {
		agentsService.findListableByUserPaginated.mockResolvedValue({ count: 5, data: agentRows });

		const result = await controller.listAgents(req, res, { limit: 2 });

		expect(result.nextCursor).toBe(
			Buffer.from(JSON.stringify({ limit: 2, offset: 2 })).toString('base64'),
		);
	});

	it('passes the projectId filter through', async () => {
		agentsService.findListableByUserPaginated.mockResolvedValue({ count: 0, data: [] });

		await controller.listAgents(req, res, { limit: 2, projectId: 'project-2' });

		expect(agentsService.findListableByUserPaginated).toHaveBeenCalledWith(req.user, {
			offset: 0,
			limit: 2,
			filter: { projectId: 'project-2' },
		});
	});

	it('answers 400 when the cursor is invalid', async () => {
		await expect(
			controller.listAgents(req, res, { limit: 2, cursor: 'not-a-cursor' }),
		).rejects.toThrow(BadRequestError);

		expect(agentsService.findListableByUserPaginated).not.toHaveBeenCalled();
	});
});

describe('AgentsPublicController updateAgent', () => {
	const agentsService = mock<AgentsService>();
	const agentResponseMapper = mock<AgentResponseMapper>();
	const agentConfigService = mock<AgentConfigService>();
	const controller = new AgentsPublicController(
		agentsService,
		agentResponseMapper,
		mock<AgentDefaultModelResolverService>(),
		mock<AgentCustomToolsService>(),
		mock<AgentPublicRunService>(),
		agentConfigService,
		mock<AgentPublishService>(),
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	const agentEntity = {
		id: 'agent-1',
		projectId: 'project-1',
	} as unknown as Awaited<ReturnType<AgentsService['findById']>>;

	const config = { name: 'My Agent', model: 'openai/gpt-5', instructions: 'Help users' };

	it('replaces the config and returns the public DTO without builder state', async () => {
		agentsService.findById.mockResolvedValueOnce(agentEntity).mockResolvedValueOnce(agentEntity);
		agentConfigService.updateConfig.mockResolvedValue({} as never);
		agentResponseMapper.toPublicDto.mockResolvedValue(toAgentPublicDto(fullAgentDto));

		const result = await controller.updateAgent(req, res, 'agent-1', {
			config,
			baseConfigHash: 'hash-1',
		});

		expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			config,
			req.user,
			{ baseConfigHash: 'hash-1', modifiedBy: 'user' },
		);
		expect(agentResponseMapper.toPublicDto).toHaveBeenCalledWith(
			agentEntity,
			'project-1',
			req.user,
		);
		expect(result).toEqual({
			id: 'agent-1',
			name: 'My Agent',
			projectId: 'project-1',
			project: null,
			parentFolder: null,
			availableInMCP: false,
			isArchived: false,
			versionId: 'version-1',
			activeVersionId: null,
			createdAt: '2025-01-02T03:04:05.000Z',
			updatedAt: '2025-06-07T08:09:10.000Z',
			config: { name: 'My Agent', model: '', instructions: '' },
			configHash: 'hash-1',
			tools: {},
			activeVersion: null,
		});
	});

	it('answers 404 when the agent does not exist', async () => {
		agentsService.findById.mockResolvedValue(null);

		await expect(
			controller.updateAgent(req, res, 'missing-agent', {
				config,
				baseConfigHash: 'hash-1',
			}),
		).rejects.toThrow(NotFoundError);

		expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
	});

	it('propagates the conflict when the config hash is stale', async () => {
		agentsService.findById.mockResolvedValue(agentEntity);
		agentConfigService.updateConfig.mockRejectedValue(
			new ConflictError('Agent config was changed elsewhere; reload to get the latest version'),
		);

		await expect(
			controller.updateAgent(req, res, 'agent-1', {
				config,
				baseConfigHash: 'stale-hash',
			}),
		).rejects.toThrow(ConflictError);
	});

	it('treats a null config as a no-op for an agent without a configuration', async () => {
		const noConfigAgent = {
			id: 'agent-1',
			projectId: 'project-1',
			schema: null,
		} as unknown as Awaited<ReturnType<AgentsService['findById']>>;
		agentsService.findById.mockResolvedValue(noConfigAgent);
		agentResponseMapper.toPublicDto.mockResolvedValue(toAgentPublicDto(fullAgentDto));

		const result = await controller.updateAgent(req, res, 'agent-1', {
			config: null,
			baseConfigHash: null,
		});

		expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
		expect(agentResponseMapper.toPublicDto).toHaveBeenCalledWith(
			noConfigAgent,
			'project-1',
			req.user,
		);
		expect(result).toEqual({
			id: 'agent-1',
			name: 'My Agent',
			projectId: 'project-1',
			project: null,
			parentFolder: null,
			availableInMCP: false,
			isArchived: false,
			versionId: 'version-1',
			activeVersionId: null,
			createdAt: '2025-01-02T03:04:05.000Z',
			updatedAt: '2025-06-07T08:09:10.000Z',
			config: { name: 'My Agent', model: '', instructions: '' },
			configHash: 'hash-1',
			tools: {},
			activeVersion: null,
		});
	});

	it('rejects a null config when the agent has a configuration', async () => {
		agentsService.findById.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			schema: { name: 'My Agent' },
		} as unknown as Awaited<ReturnType<AgentsService['findById']>>);

		await expect(
			controller.updateAgent(req, res, 'agent-1', { config: null, baseConfigHash: 'hash-1' }),
		).rejects.toThrow(BadRequestError);

		expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
	});
});

describe('AgentsPublicController deleteAgent', () => {
	const agentsService = mock<AgentsService>();
	const agentResponseMapper = mock<AgentResponseMapper>();
	const agentDefaultModelResolverService = mock<AgentDefaultModelResolverService>();
	const controller = new AgentsPublicController(
		agentsService,
		agentResponseMapper,
		agentDefaultModelResolverService,
		mock<AgentCustomToolsService>(),
		mock<AgentPublicRunService>(),
		mock<AgentConfigService>(),
		mock<AgentPublishService>(),
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	const agent = {
		id: 'agent-1',
		name: 'My Agent',
		projectId: 'project-1',
		availableInMCP: false,
		versionId: 'version-1',
		activeVersionId: null,
		createdAt: new Date('2025-01-02T03:04:05Z'),
		updatedAt: new Date('2025-06-07T08:09:10Z'),
	} as unknown as DeletedAgentSnapshot;

	it('deletes the agent by ID and returns its metadata', async () => {
		agentsService.delete.mockResolvedValue(agent);

		const result = await controller.deleteAgent(req, res, 'agent-1');

		expect(agentsService.delete).toHaveBeenCalledWith('agent-1', req.user, undefined, {}, req.ctx);
		expect(result).toEqual({
			id: 'agent-1',
			name: 'My Agent',
			projectId: 'project-1',
			availableInMCP: false,
			versionId: 'version-1',
			activeVersionId: null,
			createdAt: '2025-01-02T03:04:05.000Z',
			updatedAt: '2025-06-07T08:09:10.000Z',
		});
	});

	it('answers 404 when the agent does not exist', async () => {
		agentsService.delete.mockResolvedValue(null);

		await expect(controller.deleteAgent(req, res, 'missing-agent')).rejects.toThrow(NotFoundError);
	});
});

describe('AgentsPublicController run and stop', () => {
	const agentPublicRunService = mock<AgentPublicRunService>();
	const controller = new AgentsPublicController(
		mock<AgentsService>(),
		mock<AgentResponseMapper>(),
		mock<AgentDefaultModelResolverService>(),
		mock<AgentCustomToolsService>(),
		agentPublicRunService,
		mock<AgentConfigService>(),
		mock<AgentPublishService>(),
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	it('delegates a run to the public run service', async () => {
		const body = { response: 'Hello', sessionId: 'session-1', executionId: 'execution-1' };
		agentPublicRunService.run.mockResolvedValue(body as never);

		await expect(controller.runAgent(req, res, 'agent-1', { message: 'Hi' })).resolves.toBe(body);
		expect(agentPublicRunService.run).toHaveBeenCalledWith(
			req.user,
			'agent-1',
			{ message: 'Hi' },
			expect.any(AbortSignal),
		);
	});

	it('delegates a stop to the public run service', async () => {
		const body = { executionId: 'execution-1', status: 'cancel_requested' as const };
		agentPublicRunService.stop.mockResolvedValue(body);

		await expect(controller.stopAgentExecution(req, res, 'agent-1', 'execution-1')).resolves.toBe(
			body,
		);
		expect(agentPublicRunService.stop).toHaveBeenCalledWith(req.user, 'agent-1', 'execution-1');
	});

	it('delegates an executions list to the public run service and encodes the next cursor', async () => {
		const row = {
			executionId: 'execution-1',
			sessionId: 'session-1',
			status: 'success' as const,
			source: 'public_api',
			createdAt: '2026-11-19T14:00:00.000Z',
			startedAt: null,
			stoppedAt: null,
			usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5, cost: 0.1 },
		};
		agentPublicRunService.listExecutions.mockResolvedValue({ count: 1, data: [row] });

		await expect(
			controller.listAgentExecutions(req, res, 'agent-1', { limit: 100 }),
		).resolves.toEqual({ data: [row], nextCursor: null });
		expect(agentPublicRunService.listExecutions).toHaveBeenCalledWith(req.user, 'agent-1', {
			offset: 0,
			limit: 100,
			sessionId: undefined,
			status: undefined,
		});
	});
});

describe('AgentsPublicController agent versions', () => {
	const agentsService = mock<AgentsService>();
	const agentPublishService = mock<AgentPublishService>();
	const controller = new AgentsPublicController(
		agentsService,
		mock<AgentResponseMapper>(),
		mock<AgentDefaultModelResolverService>(),
		mock<AgentCustomToolsService>(),
		mock<AgentPublicRunService>(),
		mock<AgentConfigService>(),
		agentPublishService,
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	const version = {
		versionId: 'version-1',
		agentId: 'agent-1',
		name: 'Support',
		description: null,
		author: 'Ada Lovelace',
		createdAt: '2025-01-03T00:00:00.000Z',
		updatedAt: '2025-01-03T00:00:00.000Z',
		isActive: true,
		isCurrent: false,
		includesN8nChat: true,
	};

	beforeEach(() => {
		agentsService.findById.mockResolvedValue({ id: 'agent-1', projectId: 'project-1' } as never);
	});

	it('returns one cursor page and drops editor-only list fields', async () => {
		agentPublishService.listVersions.mockResolvedValue([
			version,
			{ ...version, versionId: 'version-2' },
			{ ...version, versionId: 'version-3' },
		]);

		const result = await controller.listAgentVersions(req, res, 'agent-1', { limit: 2 });

		expect(agentPublishService.listVersions).toHaveBeenCalledWith('agent-1', 'project-1', 3, 0);
		expect(result.data).toHaveLength(2);
		expect(result.data[0]).toEqual({
			versionId: 'version-1',
			agentId: 'agent-1',
			name: 'Support',
			description: null,
			author: 'Ada Lovelace',
			createdAt: '2025-01-03T00:00:00.000Z',
			updatedAt: '2025-01-03T00:00:00.000Z',
			isActive: true,
			isCurrent: false,
		});
		expect(result.data[0]).not.toHaveProperty('includesN8nChat');
		expect(result.nextCursor).toEqual(expect.any(String));
	});

	it('returns a null cursor on the last page', async () => {
		agentPublishService.listVersions.mockResolvedValue([version]);

		const result = await controller.listAgentVersions(req, res, 'agent-1', { limit: 2 });

		expect(result.data).toHaveLength(1);
		expect(result.nextCursor).toBeNull();
	});

	it('answers 404 when the agent has no project', async () => {
		agentsService.findById.mockResolvedValue(null);

		await expect(controller.listAgentVersions(req, res, 'missing', { limit: 10 })).rejects.toThrow(
			NotFoundError,
		);
		expect(agentPublishService.listVersions).not.toHaveBeenCalled();
	});

	it('returns the saved document and omits editor-only fields', async () => {
		agentPublishService.getVersionSummary.mockResolvedValue(version);
		agentPublishService.getVersion.mockResolvedValue({
			definition: {
				schema: { name: 'Support', model: '', instructions: 'Help users.' },
				tools: { lookup: { code: 'return 1;', descriptor: { name: 'lookup' } } },
				skills: {
					writing: { name: 'Writing', description: 'Write', instructions: 'Write well.' },
				},
				tasks: new Map([['task-1', { name: 'Daily' }]]),
			},
		} as never);

		const result = await controller.getAgentVersion(req, res, 'agent-1', 'version-1');

		expect(result).toEqual({
			versionId: 'version-1',
			agentId: 'agent-1',
			name: 'Support',
			description: null,
			author: 'Ada Lovelace',
			createdAt: '2025-01-03T00:00:00.000Z',
			updatedAt: '2025-01-03T00:00:00.000Z',
			isActive: true,
			isCurrent: false,
			config: { name: 'Support', model: '', instructions: 'Help users.' },
			tools: { lookup: { code: 'return 1;', descriptor: { name: 'lookup' } } },
			skills: { writing: { name: 'Writing', description: 'Write', instructions: 'Write well.' } },
		});
		expect(result).not.toHaveProperty('includesN8nChat');
		expect(result).not.toHaveProperty('tasks');
	});
});

describe('AgentsPublicController archive and unarchive', () => {
	const agentsService = mock<AgentsService>();
	const agentResponseMapper = mock<AgentResponseMapper>();
	const agentPublishService = mock<AgentPublishService>();
	const controller = new AgentsPublicController(
		agentsService,
		agentResponseMapper,
		mock<AgentDefaultModelResolverService>(),
		mock<AgentCustomToolsService>(),
		mock<AgentPublicRunService>(),
		mock<AgentConfigService>(),
		agentPublishService,
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();
	const liveAgent = { id: 'agent-1', projectId: 'project-1', isArchived: false } as never;
	const archivedAgent = { id: 'agent-1', projectId: 'project-1', isArchived: true } as never;
	const publicDto = toAgentPublicDto(fullAgentDto);

	beforeEach(() => {
		agentsService.findById.mockReset();
		agentPublishService.archiveAgent.mockReset();
		agentPublishService.unarchiveAgent.mockReset();
		agentResponseMapper.toPublicDto.mockReset();
	});

	it('archives the agent and returns the public DTO', async () => {
		agentsService.findById.mockResolvedValue(liveAgent);
		agentPublishService.archiveAgent.mockResolvedValue(archivedAgent);
		agentResponseMapper.toPublicDto.mockResolvedValue(publicDto);

		const result = await controller.archiveAgent(req, res, 'agent-1');

		expect(agentPublishService.archiveAgent).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			req.user,
			undefined,
			'user',
			req.ctx,
		);
		expect(agentResponseMapper.toPublicDto).toHaveBeenCalledWith(
			archivedAgent,
			'project-1',
			req.user,
		);
		expect(result).toBe(publicDto);
	});

	it('returns the current agent when it is already archived', async () => {
		agentsService.findById.mockResolvedValueOnce(liveAgent).mockResolvedValueOnce(archivedAgent);
		agentPublishService.archiveAgent.mockRejectedValue(
			new BadRequestError('Agent is already archived.'),
		);
		agentResponseMapper.toPublicDto.mockResolvedValue(publicDto);

		const result = await controller.archiveAgent(req, res, 'agent-1');

		expect(agentResponseMapper.toPublicDto).toHaveBeenCalledWith(
			archivedAgent,
			'project-1',
			req.user,
		);
		expect(result).toBe(publicDto);
	});

	it('rethrows a bad request when the agent is not archived', async () => {
		agentsService.findById.mockResolvedValue(liveAgent);
		agentPublishService.archiveAgent.mockRejectedValue(new BadRequestError('nope'));

		await expect(controller.archiveAgent(req, res, 'agent-1')).rejects.toThrow(BadRequestError);
		expect(agentResponseMapper.toPublicDto).not.toHaveBeenCalled();
	});

	it('rethrows a conflict from archive', async () => {
		agentsService.findById.mockResolvedValue(liveAgent);
		const conflict = new ConflictError('Agent was modified concurrently; please retry');
		agentPublishService.archiveAgent.mockRejectedValue(conflict);

		await expect(controller.archiveAgent(req, res, 'agent-1')).rejects.toBe(conflict);
		expect(agentResponseMapper.toPublicDto).not.toHaveBeenCalled();
	});

	it('answers 404 when archive cannot find the agent', async () => {
		agentsService.findById.mockResolvedValue(null);

		await expect(controller.archiveAgent(req, res, 'missing-agent')).rejects.toThrow(NotFoundError);
		expect(agentPublishService.archiveAgent).not.toHaveBeenCalled();
	});

	it('answers 404 when unarchive cannot find the agent', async () => {
		agentsService.findById.mockResolvedValue(null);

		await expect(controller.unarchiveAgent(req, res, 'missing-agent')).rejects.toThrow(
			NotFoundError,
		);
		expect(agentPublishService.unarchiveAgent).not.toHaveBeenCalled();
	});

	it('restores an archived agent and returns the public DTO', async () => {
		agentsService.findById.mockResolvedValue(archivedAgent);
		agentPublishService.unarchiveAgent.mockResolvedValue(liveAgent);
		agentResponseMapper.toPublicDto.mockResolvedValue(publicDto);

		const result = await controller.unarchiveAgent(req, res, 'agent-1');

		expect(agentPublishService.unarchiveAgent).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			req.user,
			undefined,
			req.ctx,
		);
		expect(agentResponseMapper.toPublicDto).toHaveBeenCalledWith(liveAgent, 'project-1', req.user);
		expect(result).toBe(publicDto);
	});
});
