/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFullApiResponse, makeRestApiRequest } from '@n8n/rest-api-client';

import {
	getChatMessages,
	listAgents,
	listAgentsPage,
	createAgent,
	duplicateAgent,
} from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';

vi.mock('@n8n/rest-api-client', () => ({
	getFullApiResponse: vi.fn(),
	makeRestApiRequest: vi.fn(),
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

	describe('getChatMessages', () => {
		it('percent-encodes the thread id so a rotated session id survives as a URL, not a fragment', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ messages: [] });

			await getChatMessages(restApiContext, 'project-1', 'agent-1', 'agent-1:chat:bot-1-2#1');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'GET',
				'/projects/project-1/agents/v2/agent-1/chat/agent-1%3Achat%3Abot-1-2%231/messages',
			);
		});
	});

	describe('createAgent', () => {
		it('posts only the name when no seeding options are given', async () => {
			const agent = { id: 'agent-1', name: 'Support Agent' } as AgentResource;
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(agent);

			const result = await createAgent(restApiContext, 'project-1', 'Support Agent');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'POST',
				'/projects/project-1/agents/v2',
				{ name: 'Support Agent' },
			);
			expect(result).toBe(agent);
		});

		it('forwards a client-minted id when supplied', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({} as AgentResource);

			await createAgent(restApiContext, 'project-1', 'Support Agent', { id: 'aBcDeFgHiJkLmNoP' });

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'POST',
				'/projects/project-1/agents/v2',
				{ name: 'Support Agent', id: 'aBcDeFgHiJkLmNoP' },
			);
		});

		it('forwards schema, tools and skills so a duplicate clones in one insert', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({} as AgentResource);
			const schema = {
				name: 'Copy',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: '',
			} as unknown as AgentJsonConfig;
			const tools = {
				refund_tool: { code: 'return 1', descriptor: { name: 'refund_tool' } },
			} as never;
			const skills = { skill_abc: { name: 'Triage', description: '', instructions: '' } } as never;

			await createAgent(restApiContext, 'project-1', 'Copy', { schema, tools, skills });

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'POST',
				'/projects/project-1/agents/v2',
				{ name: 'Copy', schema, tools, skills },
			);
		});
	});

	describe('duplicateAgent', () => {
		it('fetches the source agent and config, then creates a clone with the new name', async () => {
			const sourceAgent = {
				id: 'agent-1',
				name: 'Support Agent',
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
			vi.mocked(makeRestApiRequest)
				.mockResolvedValueOnce(sourceAgent)
				.mockResolvedValueOnce(sourceConfig)
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
			// createAgent posts the copied config with the new name overriding the source name.
			expect(makeRestApiRequest).toHaveBeenNthCalledWith(
				3,
				restApiContext,
				'POST',
				'/projects/project-1/agents/v2',
				{
					name: 'Support Agent (copy)',
					schema: { ...sourceConfig, name: 'Support Agent (copy)' },
					tools: sourceAgent.tools,
					skills: sourceAgent.skills,
				},
			);
		});
	});
});
