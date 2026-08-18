import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentSessionLangSmithExportService } from '../agent-session-langsmith-export.service';
import { AgentThreadsController } from '../agent-threads.controller';
import {
	getControllerMetadata,
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentThreadsController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentThreadsController);

	const routes = getRoutesByHandlerName(AgentThreadsController);

	it('uses the project agents collection route', () => {
		const metadata = getControllerMetadata(AgentThreadsController);

		expect(metadata.basePath).toBe('/projects/:projectId/agents/v2');
	});

	it.each([
		['listThreads', 'get', '/:agentId/threads'],
		['getThread', 'get', '/:agentId/threads/:threadId'],
		['exportThreadToLangSmith', 'post', '/:agentId/threads/:threadId/langsmith-export'],
		['deleteThread', 'delete', '/:agentId/threads/:threadId'],
	])('%s uses %s %s', (handlerName, method, path) => {
		expect(routes.get(handlerName)).toMatchObject({ method, path });
	});

	it.each([
		['listThreads', 'agent:read'],
		['getThread', 'agent:read'],
		['exportThreadToLangSmith', 'agent:read'],
		['deleteThread', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});

	it.each([
		[{ status: 'pending' }, 'status'],
		[{ origin: 'teams' }, 'origin'],
		[{ updatedAfter: 'not-a-date' }, 'updatedAfter'],
	])('rejects an invalid %s filter', async (query, expectedField) => {
		const service = mock<AgentExecutionService>();
		const controller = new AgentThreadsController(
			service,
			mock<AgentSessionLangSmithExportService>(),
		);
		const request = {
			params: { projectId: 'project-1', agentId: 'agent-1' },
			query,
		} as AuthenticatedRequest<
			{ projectId: string; agentId: string },
			{},
			{},
			{
				status?: string;
				origin?: string;
				updatedAfter?: string;
			}
		>;

		await expect(controller.listThreads(request)).rejects.toThrow(expectedField);
		expect(service.getThreads).not.toHaveBeenCalled();
	});
});
