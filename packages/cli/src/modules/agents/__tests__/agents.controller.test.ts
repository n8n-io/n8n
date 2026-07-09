import type { Mocked } from 'vitest';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';
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
		} as never);
		agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });
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
		expect(agentValidationService.validateAgentIsRunnable).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			expect.any(AgentsCredentialProvider),
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
		agentValidationService.validateAgentIsRunnable.mockResolvedValue({
			missing: ['credential'],
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
