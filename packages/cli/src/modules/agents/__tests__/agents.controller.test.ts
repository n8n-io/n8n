import type { Mocked } from 'vitest';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';
import type { AgentDefaultModelResolverService } from '../agent-default-model-resolver.service';
import type { AgentPublishService } from '../agent-publish.service';
import { AgentRunnableStateService } from '../agent-runnable-state.service';
import type { AgentsService } from '../agents.service';
import type { AgentValidationService } from '../agent-validation.service';
import { AgentsController } from '../agents.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController({
	agentsService = mock<
		Pick<
			AgentsService,
			'create' | 'findById' | 'findByProjectId' | 'findByProjectIdPaginated' | 'delete'
		>
	>(),
	agentPublishService = mock<AgentPublishService>(),
	agentValidationService = mock<AgentValidationService>(),
	credentialsService = mock<CredentialsService>(),
	agentDefaultModelResolverService = mock<AgentDefaultModelResolverService>(),
}: {
	agentsService?: Mocked<
		Pick<
			AgentsService,
			'create' | 'findById' | 'findByProjectId' | 'findByProjectIdPaginated' | 'delete'
		>
	>;
	agentPublishService?: Mocked<AgentPublishService>;
	agentValidationService?: Mocked<AgentValidationService>;
	credentialsService?: Mocked<CredentialsService>;
	agentDefaultModelResolverService?: Mocked<AgentDefaultModelResolverService>;
} = {}) {
	const agentRunnableStateService = new AgentRunnableStateService(
		credentialsService,
		agentValidationService,
		agentPublishService,
	);

	return {
		controller: new AgentsController(
			agentsService as unknown as AgentsService,
			agentRunnableStateService,
			agentDefaultModelResolverService,
		),
		agentsService,
		agentPublishService,
		agentValidationService,
	};
}

describe('AgentsController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentsController);

	const routes = getRoutesByHandlerName(AgentsController);

	it.each([
		['create', 'agent:create'],
		['list', 'agent:list'],
		['get', 'agent:read'],
		['delete', 'agent:delete'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentsController create', () => {
	const req = { params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never;

	function makeCreateController(createdId: string) {
		const agentPublishService = mock<AgentPublishService>();
		const agentValidationService = mock<AgentValidationService>();
		const agentsService = mock<Pick<AgentsService, 'create'>>();
		const agentDefaultModelResolverService = mock<AgentDefaultModelResolverService>();
		agentsService.create.mockResolvedValue({ id: createdId, projectId: 'project-1' } as never);
		agentDefaultModelResolverService.resolve.mockResolvedValue(null);
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'valid',
			issues: [],
		});
		agentPublishService.hasPublishHistory.mockResolvedValue(false);

		const { controller } = makeController({
			agentsService: agentsService as never,
			agentPublishService,
			agentValidationService,
			agentDefaultModelResolverService,
		});
		return { controller, agentsService, agentDefaultModelResolverService };
	}

	it('creates the agent under the id the client minted', async () => {
		const { controller, agentsService } = makeCreateController('aBcDeFgHiJkLmNoP');

		await controller.create(req, mock<Response>(), {
			name: 'Support Agent',
			id: 'aBcDeFgHiJkLmNoP',
		} as never);

		expect(agentsService.create).toHaveBeenCalledWith('project-1', 'Support Agent', {
			id: 'aBcDeFgHiJkLmNoP',
		});
	});

	it('lets the backend mint the id when the client did not supply one', async () => {
		const { controller, agentsService } = makeCreateController('server-minted');

		await controller.create(req, mock<Response>(), { name: 'Support Agent' } as never);

		expect(agentsService.create).toHaveBeenCalledWith('project-1', 'Support Agent', {
			id: undefined,
		});
	});

	it('passes a resolved default model to the service', async () => {
		const { controller, agentsService, agentDefaultModelResolverService } =
			makeCreateController('server-minted');
		agentDefaultModelResolverService.resolve.mockResolvedValue({
			model: 'openai/gpt-5-mini',
			credential: 'managed',
		});

		await controller.create(req, mock<Response>(), { name: 'Support Agent' } as never);

		expect(agentsService.create).toHaveBeenCalledWith('project-1', 'Support Agent', {
			id: undefined,
			defaultModel: { model: 'openai/gpt-5-mini', credential: 'managed' },
		});
	});

	it('seeds the schema, skills, and tools for a duplicate and skips default-model resolution', async () => {
		const { controller, agentsService, agentDefaultModelResolverService } =
			makeCreateController('agent-copy');
		const skills = { skill1: { name: 'Triage', instructions: 'Sort tickets.' } };
		const tools = { tool1: { code: 'return []', descriptor: { name: 'Lookup' } } };
		const schema = {
			name: 'Source Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Triage tickets.',
			integrations: [{ type: 'slack', credentialId: 'cred-slack-1' }],
		};

		await controller.create(req, mock<Response>(), {
			name: 'Source Agent Copy',
			schema,
			skills,
			tools,
		} as never);

		// A duplicate carries its own model, so the resolver is never called.
		expect(agentDefaultModelResolverService.resolve).not.toHaveBeenCalled();
		// The duplicate is a user-driven write, so the controller threads the
		// user through — the service blanks inaccessible credentials and copies
		// channels as drafts off that flag.
		expect(agentsService.create).toHaveBeenCalledWith(
			'project-1',
			'Source Agent Copy',
			expect.objectContaining({
				schema: expect.objectContaining({ model: 'anthropic/claude-sonnet-4-5' }),
				skills,
				tools,
				user: { id: 'user-1' },
			}),
		);
		// No default model is resolved for a duplicate.
		const [, , options] = agentsService.create.mock.calls[0] as [
			string,
			string,
			Record<string, unknown>,
		];
		expect(options).not.toHaveProperty('defaultModel');
	});

	it('overrides the schema name with the entity name on a duplicate', async () => {
		const { controller, agentsService } = makeCreateController('agent-copy');
		const schema = {
			name: 'Source Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Triage tickets.',
		};

		await controller.create(req, mock<Response>(), {
			name: 'Source Agent Copy',
			schema,
		} as never);

		// The config name is kept in sync with the entity name so the list and
		// the builder never disagree on a directly-seeded create.
		expect(agentsService.create).toHaveBeenCalledWith(
			'project-1',
			'Source Agent Copy',
			expect.objectContaining({
				schema: { ...schema, name: 'Source Agent Copy' },
			}),
		);
	});
});

describe('AgentsController list', () => {
	const req = { params: { projectId: 'project-1' }, query: {}, user: { id: 'user-1' } } as never;

	it('uses backend listing when no query options are provided', async () => {
		const { controller, agentsService } = makeController();
		const response = { count: 1, data: [{ id: 'agent-1' }] } as never;
		const res = mock<Response>();
		const query = {
			skip: 0,
			take: 10,
		} as never;
		agentsService.findByProjectIdPaginated.mockResolvedValue(response);

		await controller.list(req, res, query);

		expect(agentsService.findByProjectIdPaginated).toHaveBeenCalledWith('project-1', query);
		expect(agentsService.findByProjectId).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalledWith(response);
	});

	it('uses backend listing when pagination, sorting, or filters are provided', async () => {
		const { controller, agentsService } = makeController();
		const response = { count: 1, data: [{ id: 'agent-1' }] } as never;
		const res = mock<Response>();
		const query = {
			skip: 0,
			take: 50,
			sortBy: 'name:asc',
			filter: { query: 'support' },
		} as never;
		agentsService.findByProjectIdPaginated.mockResolvedValue(response);
		const listReq = {
			params: { projectId: 'project-1' },
			query: { skip: '0', take: '50', sortBy: 'name:asc', filter: '{"query":"support"}' },
			user: { id: 'user-1' },
		} as never;

		await controller.list(listReq, res, query);

		expect(agentsService.findByProjectIdPaginated).toHaveBeenCalledWith('project-1', query);
		expect(agentsService.findByProjectId).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalledWith(response);
	});
});

describe('AgentsController agent resource', () => {
	it('adds runnable state to the single-agent response', async () => {
		const agentsService =
			mock<Pick<AgentsService, 'findById' | 'findByProjectId' | 'findByProjectIdPaginated'>>();
		const agentPublishService = mock<AgentPublishService>();
		const agentValidationService = mock<AgentValidationService>();
		agentsService.findById.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			skills: {
				triage: {
					name: 'Triage',
					description: 'Triage requests',
					instructions: 'Route each request.',
				},
			},
		} as never);
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'valid',
			issues: [],
		});
		agentPublishService.hasPublishHistory.mockResolvedValue(false);

		const { controller } = makeController({
			agentsService: agentsService as never,
			agentPublishService,
			agentValidationService,
		});

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
		expect(result.skillHashes.triage).toMatch(/^[a-f0-9]{64}$/);
		expect(agentValidationService.validateLoadedAgentConfiguration).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'agent-1' }),
			'project-1',
			expect.any(AgentsCredentialProvider),
			'runtime',
		);
	});

	it('marks the single-agent response as not runnable when validation reports missing fields', async () => {
		const agentsService =
			mock<Pick<AgentsService, 'findById' | 'findByProjectId' | 'findByProjectIdPaginated'>>();
		const agentPublishService = mock<AgentPublishService>();
		const agentValidationService = mock<AgentValidationService>();
		agentsService.findById.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
		} as never);
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
		});
		agentPublishService.hasPublishHistory.mockResolvedValue(false);

		const { controller } = makeController({
			agentsService: agentsService as never,
			agentPublishService,
			agentValidationService,
		});

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
