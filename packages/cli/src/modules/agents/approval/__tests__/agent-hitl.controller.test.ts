import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { ProjectAgent } from '../../entities/agent.entity';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from '../../__tests__/test-utils/controller-route-metadata';
import type { AgentHitlRequestsService } from '../agent-hitl-requests.service';
import { AgentHitlController } from '../agent-hitl.controller';

describe('Advanced HITL routes', () => {
	expectProjectScopedAgentRoutes(AgentHitlController);
	const routes = getRoutesByHandlerName(AgentHitlController);
	it.each([
		['list', 'agent:read'],
		['cancel', 'agent:execute'],
	])('%s uses %s', (name, scope) => {
		expect(routes.get(name)?.accessScope?.scope).toBe(scope);
	});
	it('checks project ownership before it lists or cancels requests', async () => {
		const agents = mock<AgentRepository>();
		const requests = mock<AgentHitlRequestsService>();
		const controller = new AgentHitlController(agents, requests);
		const req = { params: { projectId: 'other-project' } } as AuthenticatedRequest<{
			projectId: string;
		}>;
		agents.findByIdAndProjectId.mockResolvedValue(null);
		await expect(controller.list(req, mock<Response>(), 'agent')).rejects.toThrow();
		await expect(controller.cancel(req, mock<Response>(), 'agent', 'request')).rejects.toThrow();
		expect(requests.list).not.toHaveBeenCalled();
		expect(requests.cancel).not.toHaveBeenCalled();
		agents.findByIdAndProjectId.mockResolvedValue({ id: 'agent' } as ProjectAgent);
		await controller.cancel(req, mock<Response>(), 'agent', 'request');
		expect(requests.cancel).toHaveBeenCalledWith('agent', 'request');
	});
});
