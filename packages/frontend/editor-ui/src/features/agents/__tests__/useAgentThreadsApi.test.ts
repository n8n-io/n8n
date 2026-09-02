/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	defaultAgentSessionFilters,
	deleteThread,
	getThreadDetail,
	listThreads,
} from '../composables/useAgentThreadsApi';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('useAgentThreadsApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists threads from the agent-scoped collection', async () => {
		const response = { threads: [], nextCursor: null };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await listThreads(restApiContext, 'project-1', 'agent-1', {
			limit: 20,
			cursor: 'cursor-1',
			filters: defaultAgentSessionFilters(),
		});

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agents/v2/agent-1/threads?limit=20&cursor=cursor-1',
		);
		expect(result).toBe(response);
	});

	it('serializes active session filters', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ threads: [], nextCursor: null });

		await listThreads(restApiContext, 'project-1', 'agent-1', {
			limit: 20,
			filters: {
				status: 'error',
				origin: 'slack',
				startDate: new Date('2026-01-01T00:00:00Z'),
				endDate: '2026-01-02T00:00:00Z',
			},
		});

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agents/v2/agent-1/threads?limit=20&status=error&origin=slack&updatedAfter=2026-01-01T00%3A00%3A00.000Z&updatedBefore=2026-01-02T00%3A00%3A00.000Z',
		);
	});

	it('gets thread detail from the agent-scoped collection', async () => {
		const response = { thread: { id: 'thread-1' }, executions: [] };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await getThreadDetail(restApiContext, 'project-1', 'agent-1', 'thread-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agents/v2/agent-1/threads/thread-1',
		);
		expect(result).toBe(response);
	});

	it('deletes a thread from the agent-scoped collection', async () => {
		const response = { success: true };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await deleteThread(restApiContext, 'project-1', 'agent-1', 'thread-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'DELETE',
			'/projects/project-1/agents/v2/agent-1/threads/thread-1',
		);
		expect(result).toBe(response);
	});
});
