import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentSessionLangSmithExportService } from '../agent-session-langsmith-export.service';
import { AgentThreadsController } from '../agent-threads.controller';
import type { AgentExecution } from '../entities/agent-execution.entity';
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
});

describe('AgentThreadsController.getThread', () => {
	it('does not expose the internal turn claim context', async () => {
		const executionService = mock<AgentExecutionService>();
		executionService.getThreadDetail.mockResolvedValue({
			thread: { id: 'thread-1' } as never,
			executions: [
				{
					id: 'execution-1',
					status: 'running',
					runContext: { kind: 'resume' },
				} as AgentExecution,
			],
		});
		const controller = new AgentThreadsController(
			executionService,
			mock<AgentSessionLangSmithExportService>(),
		);

		const result = await controller.getThread({
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		} as never);

		expect(result.executions[0]).toMatchObject({ id: 'execution-1', status: 'running' });
		expect(result.executions[0]).not.toHaveProperty('runContext');
	});
});
