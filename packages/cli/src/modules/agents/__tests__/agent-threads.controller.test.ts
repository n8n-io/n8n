import type { AuthenticatedRequest, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentSessionLangSmithExportService } from '../agent-session-langsmith-export.service';
import { AgentThreadsController } from '../agent-threads.controller';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import { SystemAgentRegistry } from '../system-agents/system-agent-registry';
import type {
	SystemAgentProvider,
	SystemAgentSharingPolicy,
} from '../system-agents/system-agent.types';
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
			new SystemAgentRegistry(),
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
		{
			name: 'private root',
			accessScope: 'user',
			parentThreadId: null,
			source: 'chat',
			expected: true,
		},
		{ name: 'MCP root', accessScope: 'user', parentThreadId: null, source: 'mcp', expected: false },
		{
			name: 'Instance AI root',
			accessScope: 'user',
			parentThreadId: null,
			source: 'instance-ai',
			expected: false,
		},
		{
			name: 'shared root',
			accessScope: 'project',
			parentThreadId: null,
			source: 'mcp',
			expected: false,
		},
		{
			name: 'child',
			accessScope: 'user',
			parentThreadId: 'parent',
			source: 'mcp',
			expected: false,
		},
		{
			name: 'legacy sub-agent',
			accessScope: 'user',
			parentThreadId: null,
			source: 'subagent',
			expected: false,
		},
		{
			name: 'source-less private root',
			accessScope: 'user',
			parentThreadId: null,
			source: null,
			expected: true,
		},
	] as const)(
		'returns origin and Preview eligibility for a $name session',
		async ({ accessScope, parentThreadId, source, expected }) => {
			const service = mock<AgentExecutionService>();
			const controller = new AgentThreadsController(
				service,
				mock<AgentSessionLangSmithExportService>(),
				new SystemAgentRegistry(),
			);
			service.getThreadDetail.mockResolvedValue({
				thread: mock<AgentExecutionThread>({
					id: 'thread-1',
					agentId: 'agent-1',
					projectId: 'project-1',
					ownerId: 'user-1',
					accessScope,
					parentThreadId,
					taskId: null,
				}),
				executions: [mock<AgentExecution>({ source: null }), mock<AgentExecution>({ source })],
			});
			const result = await controller.getThread(
				mock<AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>>({
					params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
					user: mock<User>({ id: 'user-1' }),
				}),
			);

			expect(result.thread.canContinueInPreview).toBe(expected);
			expect(result.thread.source).toBe(source);
			expect(result.thread).not.toHaveProperty('ownerId');
			expect(result.thread).not.toHaveProperty('accessScope');
		},
	);
});

describe('AgentThreadsController instance agent sessions', () => {
	function setup(authorized: boolean, readsShared = true) {
		const service = mock<AgentExecutionService>();
		const registry = new SystemAgentRegistry();
		const provider = mock<SystemAgentProvider>({ agentId: 'n8n-assistant', name: 'Assistant' });
		const sharing = mock<SystemAgentSharingPolicy>();
		sharing.canReadSharedIn.mockResolvedValue(readsShared);
		sharing.canRead.mockResolvedValue(readsShared);
		Object.defineProperty(provider, 'sharing', { value: sharing });
		provider.authorize.mockResolvedValue(authorized);
		registry.register(provider);
		const controller = new AgentThreadsController(
			service,
			mock<AgentSessionLangSmithExportService>(),
			registry,
		);
		const user = mock<User>({ id: 'user-1' });
		const request = (threadId?: string) =>
			mock<AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>>({
				params: { projectId: 'project-1', agentId: 'n8n-assistant', threadId: threadId ?? '' },
				user,
			});
		return { service, controller, provider, sharing, user, request };
	}

	it('answers 404 to a user who cannot use the instance agent in the project', async () => {
		const { service, controller, provider, user, request } = setup(false);

		await expect(controller.listThreads(request(), mock(), {})).rejects.toThrow(
			'Agent "n8n-assistant" not found',
		);
		await expect(controller.getThread(request('thread-1'))).rejects.toThrow(
			'Agent "n8n-assistant" not found',
		);
		expect(provider.authorize).toHaveBeenCalledWith(user, 'project-1');
		expect(service.getThreads).not.toHaveBeenCalled();
		expect(service.getThreadDetail).not.toHaveBeenCalled();
	});

	it('lists the sessions for a user who can use the instance agent', async () => {
		const { service, controller, sharing, user, request } = setup(true);
		service.getThreads.mockResolvedValue({ threads: [], nextCursor: null });

		await expect(controller.listThreads(request(), mock(), {})).resolves.toEqual({
			threads: [],
			nextCursor: null,
		});
		expect(sharing.canReadSharedIn).toHaveBeenCalledWith(user, 'project-1');
		expect(service.getThreads).toHaveBeenCalledWith(
			'project-1',
			'n8n-assistant',
			'user-1',
			20,
			undefined,
			{},
		);
	});

	it('lists only the own sessions of a user who cannot read shared threads in the project', async () => {
		const { service, controller, request } = setup(true, false);
		service.getThreads.mockResolvedValue({ threads: [], nextCursor: null });

		await controller.listThreads(request(), mock(), { scope: 'all', status: 'error' });

		expect(service.getThreads).toHaveBeenCalledWith(
			'project-1',
			'n8n-assistant',
			'user-1',
			20,
			undefined,
			{ scope: 'mine', status: 'error' },
		);
	});

	it.each([
		['the owner', 'user-1', false, true],
		['a reader of the shared thread', 'owner-1', true, true],
		['a user whom the sharing rules refuse', 'owner-1', false, false],
	])('shows a session to %s: %s', async (_label, ownerId, readsShared, shown) => {
		const { service, controller, sharing, request } = setup(true, readsShared);
		const thread = mock<AgentExecutionThread>({
			id: 'thread-1',
			agentId: 'n8n-assistant',
			ownerId,
			accessScope: 'project',
		});
		service.getThreadDetail.mockResolvedValue({ thread, executions: [] });

		const detail = controller.getThread(request('thread-1'));

		if (shown) await expect(detail).resolves.toMatchObject({ thread: { id: 'thread-1' } });
		else await expect(detail).rejects.toThrow('Thread "thread-1" not found');
		expect(sharing.canRead).toHaveBeenCalledTimes(ownerId === 'user-1' ? 0 : 1);
	});
});
