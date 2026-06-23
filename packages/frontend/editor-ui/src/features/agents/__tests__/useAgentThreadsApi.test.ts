/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import { deleteThread, getThreadDetail, listThreads } from '../composables/useAgentThreadsApi';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('useAgentThreadsApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists threads from the project-level agent threads collection', async () => {
		const response = { threads: [], nextCursor: null };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await listThreads(restApiContext, 'project-1', 20, 'cursor-1', 'agent-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agent-threads/v2?limit=20&cursor=cursor-1&agentId=agent-1',
		);
		expect(result).toBe(response);
	});

	it('gets thread detail from the project-level agent threads collection', async () => {
		const response = { thread: { id: 'thread-1' }, executions: [] };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await getThreadDetail(restApiContext, 'project-1', 'thread-1', 'agent-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agent-threads/v2/thread-1?agentId=agent-1',
		);
		expect(result).toBe(response);
	});

	it('deletes a thread from the project-level agent threads collection', async () => {
		const response = { success: true };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await deleteThread(restApiContext, 'project-1', 'thread-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'DELETE',
			'/projects/project-1/agent-threads/v2/thread-1',
		);
		expect(result).toBe(response);
	});
});
