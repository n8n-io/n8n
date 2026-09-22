import type { AuthenticatedRequest, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentSessionLangSmithExportService } from '../agent-session-langsmith-export.service';
import { AgentThreadsController } from '../agent-threads.controller';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
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

	it('omits internal ownership fields from a thread response', async () => {
		const agentExecutionService = mock<AgentExecutionService>();
		const controller = new AgentThreadsController(
			agentExecutionService,
			mock<AgentSessionLangSmithExportService>(),
		);
		agentExecutionService.getThreadDetail.mockResolvedValue({
			thread: mock<AgentExecutionThread>({
				id: 'thread-1',
				ownerId: 'user-1',
				accessScope: 'user',
				owner: null,
			}),
			executions: [],
		});

		const result = await controller.getThread({
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			user: { id: 'user-1' },
		} as never);

		expect(result.thread).toMatchObject({ id: 'thread-1' });
		expect(result.thread).not.toHaveProperty('ownerId');
		expect(result.thread).not.toHaveProperty('accessScope');
		expect(result.thread).not.toHaveProperty('owner');
	});
});

describe('AgentThreadsController session details', () => {
	it.each([
		{ accessScope: 'user' as const, parentThreadId: null, expected: true },
		{ accessScope: 'project' as const, parentThreadId: null, expected: false },
		{ accessScope: 'user' as const, parentThreadId: 'parent', expected: false },
	])(
		'returns origin and Preview eligibility for $accessScope sessions with parent $parentThreadId',
		async ({ accessScope, parentThreadId, expected }) => {
			const service = mock<AgentExecutionService>();
			const controller = new AgentThreadsController(
				service,
				mock<AgentSessionLangSmithExportService>(),
			);
			service.getThreadDetail.mockResolvedValue({
				thread: mock<AgentExecutionThread>({
					id: 'thread-1',
					agentId: 'agent-1',
					projectId: 'project-1',
					ownerId: 'user-1',
					accessScope,
					parentThreadId,
				}),
				executions: [
					mock<AgentExecution>({ source: null }),
					mock<AgentExecution>({ source: 'mcp' }),
					mock<AgentExecution>({ source: 'chat' }),
				],
			});
			const result = await controller.getThread(
				mock<AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>>({
					params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
					user: mock<User>({ id: 'user-1' }),
				}),
			);

			expect(result.thread.canContinueInPreview).toBe(expected);
			expect(result.thread.source).toBe('mcp');
			expect(result.thread).not.toHaveProperty('ownerId');
			expect(result.thread).not.toHaveProperty('accessScope');
		},
	);
});
