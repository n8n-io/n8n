import type { Mocked } from 'vitest';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';
import type { AgentConfigService } from '../agent-config.service';
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
	agentConfigService = mock<Pick<AgentConfigService, 'updateConfig' | 'validateConfig'>>(),
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
	agentConfigService?: Mocked<Pick<AgentConfigService, 'updateConfig' | 'validateConfig'>>;
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
			agentConfigService as unknown as AgentConfigService,
		),
		agentsService,
		agentPublishService,
		agentValidationService,
		agentConfigService,
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

describe('AgentsController create', () => {
	const user = { id: 'user-1' };
	const req = { params: { projectId: 'project-1' }, user } as never;

	function stubRunnableState(
		agentValidationService: Mocked<AgentValidationService>,
		agentPublishService: Mocked<AgentPublishService>,
	) {
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [],
		});
		agentPublishService.hasPublishHistory.mockResolvedValue(false);
	}

	it('forwards the client-minted id and acting user to the service', async () => {
		const { controller, agentsService, agentValidationService, agentPublishService } =
			makeController();
		stubRunnableState(agentValidationService, agentPublishService);
		agentsService.create.mockResolvedValue({ id: 'minted-id', projectId: 'project-1' } as never);
		agentsService.findById.mockResolvedValue(null);

		await controller.create(
			req,
			undefined as never,
			{
				name: 'Triage Bot',
				id: 'minted-id',
			} as never,
		);

		expect(agentsService.create).toHaveBeenCalledWith('project-1', 'Triage Bot', {
			id: 'minted-id',
			user,
		});
	});

	it('applies an initial config so the row and its first content land together', async () => {
		const {
			controller,
			agentsService,
			agentConfigService,
			agentValidationService,
			agentPublishService,
		} = makeController();
		stubRunnableState(agentValidationService, agentPublishService);
		agentConfigService.validateConfig.mockResolvedValue({
			valid: true,
			config: { instructions: 'Triage inbound tickets.', name: 'Triage Bot' },
		} as never);
		agentsService.create.mockResolvedValue({ id: 'minted-id', projectId: 'project-1' } as never);
		agentsService.findById.mockResolvedValue({
			id: 'minted-id',
			projectId: 'project-1',
		} as never);

		await controller.create(
			req,
			undefined as never,
			{
				name: 'Triage Bot',
				id: 'minted-id',
				config: { instructions: 'Triage inbound tickets.' },
			} as never,
		);

		expect(agentConfigService.validateConfig).toHaveBeenCalledWith({
			instructions: 'Triage inbound tickets.',
			name: 'Triage Bot',
		});
		expect(agentConfigService.updateConfig).toHaveBeenCalledWith(
			'minted-id',
			'project-1',
			{ instructions: 'Triage inbound tickets.', name: 'Triage Bot' },
			user,
		);
	});

	it('rejects an invalid initial config without creating the agent', async () => {
		const { controller, agentsService, agentConfigService } = makeController();
		agentConfigService.validateConfig.mockResolvedValue({
			valid: false,
			error: 'model is required',
		});

		await expect(
			controller.create(
				req,
				undefined as never,
				{
					name: 'Triage Bot',
					id: 'minted-id',
					config: { model: 'nope' },
				} as never,
			),
		).rejects.toThrow('Invalid initial Agent config: model is required');

		expect(agentsService.create).not.toHaveBeenCalled();
		expect(agentConfigService.updateConfig).not.toHaveBeenCalled();
	});

	it('removes the agent again when its initial config is rejected', async () => {
		const { controller, agentsService, agentConfigService } = makeController();
		agentConfigService.validateConfig.mockResolvedValue({
			valid: true,
			config: { model: 'nope', name: 'Triage Bot' },
		} as never);
		agentsService.create.mockResolvedValue({ id: 'minted-id', projectId: 'project-1' } as never);
		agentConfigService.updateConfig.mockRejectedValue(new Error('Invalid agent config'));

		await expect(
			controller.create(
				req,
				undefined as never,
				{
					name: 'Triage Bot',
					id: 'minted-id',
					config: { model: 'nope' },
				} as never,
			),
		).rejects.toThrow('Invalid agent config');

		expect(agentsService.delete).toHaveBeenCalledWith('minted-id', 'project-1');
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
