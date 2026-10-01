/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFullApiResponse, makeRestApiRequest, request } from '@n8n/rest-api-client';

import {
	cancelAgentChatExecution,
	cancelAgentChatRun,
	getAgentBackgroundJobs,
	getAgentBudgetSpend,
	getAgentChatQueue,
	getN8nChatAgent,
	removeAgentQueuedMessage,
	steerAgentQueuedMessage,
	stopAgentBackgroundJobs,
	updateAgentQueuedMessage,
	getChatMessages,
	listAgents,
	listAgentsPage,
	listN8nChatAgents,
	listN8nChatThreads,
	duplicateAgent,
} from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';

vi.mock('@n8n/rest-api-client', () => ({
	getFullApiResponse: vi.fn(),
	makeRestApiRequest: vi.fn(),
	request: vi.fn(),
}));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('useAgentApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listAgentsPage', () => {
		it('requests agents using the raw paginated response contract', async () => {
			const response = {
				count: 1,
				data: [{ id: 'agent-1', name: 'Support Agent' } as AgentResource],
			};
			vi.mocked(getFullApiResponse).mockResolvedValueOnce(response);

			const result = await listAgentsPage(restApiContext, 'project-1', {
				skip: 10,
				take: 25,
				sortBy: 'name:asc',
				filter: { query: 'support' },
			});

			expect(getFullApiResponse).toHaveBeenCalledWith(
				restApiContext,
				'GET',
				'/projects/project-1/agents/v2',
				{
					skip: 10,
					take: 25,
					sortBy: 'name:asc',
					filter: { query: 'support' },
				},
			);
			expect(result).toBe(response);
		});
	});

	describe('listAgents', () => {
		it('aggregates all pages from the paginated endpoint for legacy project-list consumers', async () => {
			const firstPage = [{ id: 'agent-1', name: 'One' }] as AgentResource[];
			const secondPage = [{ id: 'agent-2', name: 'Two' }] as AgentResource[];
			vi.mocked(getFullApiResponse)
				.mockResolvedValueOnce({ count: 2, data: firstPage })
				.mockResolvedValueOnce({ count: 2, data: secondPage });

			const result = await listAgents(restApiContext, 'project-1');

			expect(result).toEqual([...firstPage, ...secondPage]);
			expect(getFullApiResponse).toHaveBeenNthCalledWith(
				1,
				restApiContext,
				'GET',
				'/projects/project-1/agents/v2',
				{ skip: 0, take: 250 },
			);
			expect(getFullApiResponse).toHaveBeenNthCalledWith(
				2,
				restApiContext,
				'GET',
				'/projects/project-1/agents/v2',
				{ skip: 1, take: 250 },
			);
		});
	});

	it.each([
		{ request: getAgentBackgroundJobs, method: 'GET', suffix: '' },
		{ request: stopAgentBackgroundJobs, method: 'POST', suffix: '/stop' },
	])('encodes background task identifiers for $method', async ({ request, method, suffix }) => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ tasks: [] });
		await request(restApiContext, 'project/1', 'agent/1', 'agent:chat#1');
		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			method,
			`/projects/project%2F1/agents/v2/agent%2F1/chat/agent%3Achat%231/background-tasks${suffix}`,
		);
	});

	it('requests the monthly budget spend for the agent', async () => {
		const spend = { spentUsd: 42.5 };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(spend);

		const result = await getAgentBudgetSpend(restApiContext, 'project-1', 'agent-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agents/v2/agent-1/budget',
		);
		expect(result).toBe(spend);
	});

	it('encodes the queue route identifiers for listing, editing, removal, and steering', async () => {
		const args = [restApiContext, 'project/1', 'agent/1', 'agent:chat#1'] as const;
		await getAgentChatQueue(...args);
		await updateAgentQueuedMessage(...args, 'queue/1', { message: 'edited' });
		await removeAgentQueuedMessage(...args, 'queue/1');
		await steerAgentQueuedMessage(...args, 'queue/1', { executionId: 'A' });

		const path = '/projects/project%2F1/agents/v2/agent%2F1/chat/agent%3Achat%231/queue';
		expect(vi.mocked(makeRestApiRequest).mock.calls).toEqual([
			[restApiContext, 'GET', path],
			[restApiContext, 'PATCH', `${path}/queue%2F1`, { message: 'edited' }],
			[restApiContext, 'DELETE', `${path}/queue%2F1`],
			[restApiContext, 'POST', `${path}/queue%2F1/steer`, { executionId: 'A' }],
		]);
	});

	describe('getChatMessages', () => {
		it('percent-encodes the thread id so a rotated session id survives as a URL, not a fragment', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ messages: [] });

			await getChatMessages(restApiContext, 'project-1', 'agent-1', 'agent-1:chat:bot-1-2#1');

			// Relative to `restApiContext.baseUrl` — makeRestApiRequest prepends it itself,
			// so an endpoint that already carried `/rest` would double it in production.
			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'GET',
				'/projects/project-1/agents/v2/agent-1/chat/agent-1%3Achat%3Abot-1-2%231/messages',
			);
		});
	});

	it('encodes the Stop route identifiers', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ cancelRequested: true });

		await cancelAgentChatExecution(
			restApiContext,
			'project/1',
			'agent/1',
			'agent:chat#1',
			'execution/1',
		);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'DELETE',
			'/projects/project%2F1/agents/v2/agent%2F1/chat/agent%3Achat%231/executions/execution%2F1',
		);
	});

	describe('n8n Chat channel', () => {
		it('switches the queue, messages, and stop routes to n8n-chat', async () => {
			const args = [restApiContext, 'project-1', 'agent-1', 'thread-1'] as const;
			await getAgentChatQueue(...args, 'n8n-chat');
			await updateAgentQueuedMessage(...args, 'queue-1', { message: 'edited' }, 'n8n-chat');
			await removeAgentQueuedMessage(...args, 'queue-1', 'n8n-chat');
			await getChatMessages(...args, 'n8n-chat');
			await cancelAgentChatExecution(...args, 'execution-1', 'n8n-chat');
			await cancelAgentChatRun(restApiContext, 'project-1', 'agent-1', 'run-1', 'n8n-chat');

			// Relative paths only: makeRestApiRequest prepends `restApiContext.baseUrl` itself.
			const path = '/projects/project-1/agents/v2/agent-1/n8n-chat/thread-1';
			expect(vi.mocked(makeRestApiRequest).mock.calls).toEqual([
				[restApiContext, 'GET', `${path}/queue`],
				[restApiContext, 'PATCH', `${path}/queue/queue-1`, { message: 'edited' }],
				[restApiContext, 'DELETE', `${path}/queue/queue-1`],
				[restApiContext, 'GET', `${path}/messages`],
				[restApiContext, 'DELETE', `${path}/executions/execution-1`],
				[restApiContext, 'DELETE', '/projects/project-1/agents/v2/agent-1/n8n-chat/runs/run-1'],
			]);
		});
	});

	describe('getN8nChatAgent', () => {
		it('fetches one agent from the cross-project n8n Chat route', async () => {
			const item = { id: 'agent-1', name: 'Support', project: { id: 'p1', name: 'Team' } };
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(item);

			const result = await getN8nChatAgent(restApiContext, 'agent/1');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'GET',
				'/agents/v2/n8n-chat/agents/agent%2F1',
			);
			expect(result).toBe(item);
		});
	});

	describe('listN8nChatAgents', () => {
		it('always filters by availableInChat, forwards paging and sort, and trims the query', async () => {
			const response = {
				count: 1,
				data: [{ id: 'agent-1', name: 'Support', project: { id: 'p1', name: 'Team' } }],
			};
			vi.mocked(getFullApiResponse).mockResolvedValueOnce(response);

			const result = await listN8nChatAgents(restApiContext, {
				query: '  support  ',
				skip: 10,
				take: 50,
				sortBy: 'usage:desc',
			});

			expect(getFullApiResponse).toHaveBeenCalledWith(restApiContext, 'GET', '/agents/v2', {
				filter: { availableInChat: true, query: 'support' },
				skip: 10,
				take: 50,
				sortBy: 'usage:desc',
			});
			expect(result).toBe(response);
		});

		it('omits the query from the filter when blank — not given, empty, or whitespace-only', async () => {
			vi.mocked(getFullApiResponse).mockResolvedValue({ count: 0, data: [] });

			await listN8nChatAgents(restApiContext, { skip: 0, take: 50 });
			await listN8nChatAgents(restApiContext, { query: '   ', skip: 0, take: 50 });

			expect(getFullApiResponse).toHaveBeenNthCalledWith(1, restApiContext, 'GET', '/agents/v2', {
				filter: { availableInChat: true },
				skip: 0,
				take: 50,
				sortBy: undefined,
			});
			expect(getFullApiResponse).toHaveBeenNthCalledWith(2, restApiContext, 'GET', '/agents/v2', {
				filter: { availableInChat: true },
				skip: 0,
				take: 50,
				sortBy: undefined,
			});
		});
	});

	describe('listN8nChatThreads', () => {
		it('reads the full response body, not just the data key, so nextCursor survives', async () => {
			const response = {
				data: [
					{
						id: 'thread-1',
						title: 'Support question',
						updatedAt: '2025-01-02T00:00:00.000Z',
						agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
					},
				],
				nextCursor: '2025-01-02T00:00:00.000Z',
			};
			vi.mocked(request).mockResolvedValueOnce(response);

			const result = await listN8nChatThreads(restApiContext, { limit: 20, cursor: 'cursor-1' });

			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({ endpoint: '/agents/v2/n8n-chat/threads' }),
			);
			expect(result).toBe(response);
		});

		it('throws on a response body with the wrong shape', async () => {
			vi.mocked(request).mockResolvedValueOnce({ data: [], nextCursor: 123 });

			await expect(listN8nChatThreads(restApiContext, { limit: 20 })).rejects.toThrow();
		});
	});

	describe('duplicateAgent', () => {
		it('fetches the source agent and config, then creates a clone with the new name', async () => {
			const sourceAgent = {
				id: 'agent-1',
				name: 'Support Agent',
				schema: { personalisation: { icon: 'bot' } },
				tools: { refund_tool: { code: 'return 1', descriptor: { name: 'refund_tool' } } },
				skills: { skill_abc: { name: 'Triage', description: '', instructions: '' } },
			} as unknown as AgentResource;
			const sourceConfig = {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage tickets.',
			} as unknown as AgentJsonConfig;
			const cloned = { id: 'agent-2', name: 'Support Agent (copy)' } as unknown as AgentResource;
			// getAgent, getAgentConfig, then createAgent — in Promise.all order then sequential.
			// getAgentConfig returns the AgentConfigResponse envelope { config, configHash }.
			vi.mocked(makeRestApiRequest)
				.mockResolvedValueOnce(sourceAgent)
				.mockResolvedValueOnce({ config: sourceConfig, configHash: 'hash-1' })
				.mockResolvedValueOnce(cloned);

			const result = await duplicateAgent(
				restApiContext,
				'project-1',
				'agent-1',
				'Support Agent (copy)',
			);

			expect(result).toBe(cloned);
			// getAgent + getAgentConfig fetched in parallel.
			expect(makeRestApiRequest).toHaveBeenNthCalledWith(
				1,
				restApiContext,
				'GET',
				'/projects/project-1/agents/v2/agent-1',
			);
			expect(makeRestApiRequest).toHaveBeenNthCalledWith(
				2,
				restApiContext,
				'GET',
				'/projects/project-1/agents/v2/agent-1/config',
			);
			// createAgent posts the copied config with the new name overriding the source name;
			// tasks are dropped and integrations are copied without their credential.
			expect(makeRestApiRequest).toHaveBeenNthCalledWith(
				3,
				restApiContext,
				'POST',
				'/projects/project-1/agents/v2',
				{
					name: 'Support Agent (copy)',
					schema: { ...sourceConfig, name: 'Support Agent (copy)', integrations: [] },
					tools: sourceAgent.tools,
					skills: sourceAgent.skills,
				},
			);
		});

		it('copies channels without their credential so the clone opens as drafts', async () => {
			const sourceAgent = {
				id: 'agent-1',
				name: 'Support Agent',
				schema: { personalisation: { icon: 'bot' } },
				tools: {},
				skills: {},
			} as unknown as AgentResource;
			const sourceConfig = {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage tickets.',
				integrations: [
					{ type: 'telegram', credentialId: 'cred-telegram-1' },
					{ type: 'slack', credentialId: 'cred-slack-1', settings: { channel: 'C1' } },
					{ type: 'n8n_chat', credentialId: '' },
				],
			} as unknown as AgentJsonConfig;
			const cloned = { id: 'agent-2', name: 'Support Agent (copy)' } as unknown as AgentResource;
			vi.mocked(makeRestApiRequest)
				.mockResolvedValueOnce(sourceAgent)
				.mockResolvedValueOnce({ config: sourceConfig, configHash: 'hash-1' })
				.mockResolvedValueOnce(cloned);

			await duplicateAgent(restApiContext, 'project-1', 'agent-1', 'Support Agent (copy)');

			const [, , , postBody] = vi.mocked(makeRestApiRequest).mock.calls[2] as [
				unknown,
				string,
				string,
				{ schema: { integrations: unknown[] } },
			];
			// Entries kept (so the builder shows "connect a channel" chips) but
			// credentialIds blanked to drafts.
			expect(postBody.schema.integrations).toEqual([
				{ type: 'telegram', credentialId: '' },
				{ type: 'slack', credentialId: '', settings: { channel: 'C1' } },
				{ type: 'n8n_chat', credentialId: '' },
			]);
		});
	});
});
