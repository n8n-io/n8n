/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFullApiResponse, makeRestApiRequest } from '@n8n/rest-api-client';
import type { GenerateAgentToolMockResult } from '@n8n/api-types';

import {
	generateAgentToolMockData,
	getChatMessages,
	listAgents,
	listAgentsPage,
} from '../composables/useAgentApi';
import type { AgentResource } from '../types';

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

	describe('generateAgentToolMockData', () => {
		it('posts to the mock-data endpoint and returns the result', async () => {
			const result: GenerateAgentToolMockResult = {
				toolName: 'send_email',
				mock: { enabled: true, items: [{ id: 1 }] },
				fallbackUsed: false,
				config: { name: 'Agent', model: '', instructions: '' },
				updatedAt: '2026-01-01T00:00:00.000Z',
				versionId: 'version-1',
			};
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(result);

			const response = await generateAgentToolMockData(restApiContext, 'project-1', 'agent-1', {
				toolName: 'send_email',
				source: 'user',
			});

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				restApiContext,
				'POST',
				'/projects/project-1/agents/v2/agent-1/tools/mock-data',
				{ toolName: 'send_email', source: 'user' },
			);
			expect(response).toBe(result);
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
});
