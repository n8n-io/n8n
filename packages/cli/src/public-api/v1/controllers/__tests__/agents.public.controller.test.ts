import type { AgentDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { NotFoundError, UserError } from '@n8n/errors';
import type { AgentCustomToolsService } from '@/modules/agents/agent-custom-tools.service';
import type { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import type { AgentResponseMapper } from '@/modules/agents/agent-response.mapper';
import type { AgentsService, DeletedAgentSnapshot } from '@/modules/agents/agents.service';

import { AgentsPublicController } from '../agents.public.controller';

describe('AgentsPublicController route metadata', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AgentsPublicController as never,
	);
	const routes = new Map(metadata.routes);

	it('registers the create and delete routes', () => {
		expect([...routes.keys()].sort()).toEqual(['createAgent', 'deleteAgent']);
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
	);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	function mockSuccessfulCreate() {
		agentsService.resolveOwningProjectId.mockResolvedValue('project-1');
		agentsService.createOrAdopt.mockResolvedValue({ agent: {} } as never);
		agentResponseMapper.toAgentDto.mockResolvedValue(fullAgentDto);
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
		expect(agentResponseMapper.toAgentDto).toHaveBeenCalledWith({}, 'project-1', req.user);
		expect(result).toEqual({
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
			credentialId: 'credential-1',
		});

		await controller.createAgent(req, res, { name: 'No model' });
		expect(agentDefaultModelResolverService.resolve).toHaveBeenCalledWith(req.user, 'project-1');
		expect(agentsService.createOrAdopt).toHaveBeenCalledWith(
			'project-1',
			'No model',
			expect.objectContaining({
				defaultModel: { model: 'anthropic/claude-sonnet-4-5', credentialId: 'credential-1' },
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

describe('AgentsPublicController deleteAgent', () => {
	const agentsService = mock<AgentsService>();
	const agentResponseMapper = mock<AgentResponseMapper>();
	const agentDefaultModelResolverService = mock<AgentDefaultModelResolverService>();
	const controller = new AgentsPublicController(
		agentsService,
		agentResponseMapper,
		agentDefaultModelResolverService,
		mock<AgentCustomToolsService>(),
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

		expect(agentsService.delete).toHaveBeenCalledWith('agent-1');
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
