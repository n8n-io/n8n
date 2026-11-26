import type { AuthenticatedRequest } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';
import type { Response } from 'express';

import { AgentAttentionFlagsController } from '../agent-attention-flags.controller';
import { AgentAttentionFlagsService } from '../agent-attention-flags.service';
import type { AgentAttentionFlagRepository } from '../repositories/agent-attention-flag.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ProjectAgent } from '../entities/agent.entity';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('Agent attention flags', () => {
	const flags = mock<AgentAttentionFlagRepository>();
	const agents = mock<AgentRepository>();
	const service = new AgentAttentionFlagsService(flags, agents);
	const scope = { projectId: 'project', agentId: 'agent', userId: 'user' };

	beforeEach(() => {
		vi.clearAllMocks();
		agents.findByIdAndProjectId.mockResolvedValue(mock<ProjectAgent>());
	});

	expectProjectScopedAgentRoutes(AgentAttentionFlagsController);
	it('requires update scope to list or dismiss flags', () => {
		const routes = getRoutesByHandlerName(AgentAttentionFlagsController);
		expect(routes.get('list')?.accessScope?.scope).toBe('agent:update');
		expect(routes.get('dismiss')?.accessScope?.scope).toBe('agent:update');
	});

	it('checks the agent project before listing', async () => {
		await service.list(scope, 'session-error');
		expect(agents.findByIdAndProjectId).toHaveBeenCalledWith('agent', 'project');
		expect(flags.list).toHaveBeenCalledWith(scope, 'session-error');
	});

	it('rejects a different project before reading or dismissing flags', async () => {
		agents.findByIdAndProjectId.mockResolvedValue(null);
		await expect(service.list(scope)).rejects.toThrow(NotFoundError);
		await expect(
			service.dismiss(scope, { type: 'session-error', flagIds: ['flag'] }),
		).rejects.toThrow(NotFoundError);
		expect(flags.list).not.toHaveBeenCalled();
		expect(flags.dismiss).not.toHaveBeenCalled();
	});

	it('passes the authenticated user and the viewed IDs to the service', async () => {
		const handler = mock<AgentAttentionFlagsService>();
		const controller = new AgentAttentionFlagsController(handler);
		const req = mock<AuthenticatedRequest<{ projectId: string; agentId: string }>>({
			params: { projectId: 'project', agentId: 'agent' },
			user: { id: 'user' },
		});
		const payload = { type: 'session-error' as const, flagIds: ['flag'] };
		await controller.list(req, mock<Response>(), {});
		await controller.dismiss(req, mock<Response>(), payload);
		expect(handler.list).toHaveBeenCalledWith(scope, undefined);
		expect(handler.dismiss).toHaveBeenCalledWith(scope, payload);
	});
});
