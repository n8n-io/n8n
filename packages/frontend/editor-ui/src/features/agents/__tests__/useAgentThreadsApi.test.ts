/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	defaultAgentSessionFilters,
	deleteThread,
	getThreadDetail,
	listThreads,
	stopSession,
} from '../composables/useAgentThreadsApi';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('useAgentThreadsApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([false, true])('lists threads with previewOnly=%s', async (previewOnly) => {
		const response = { threads: [], nextCursor: null };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await listThreads(restApiContext, 'project-1', 'agent-1', {
			limit: 20,
			previewOnly,
			cursor: 'cursor-1',
			filters: defaultAgentSessionFilters(),
		});

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agents/v2/agent-1/threads?limit=20&cursor=cursor-1' +
				(previewOnly ? '&previewOnly=true' : ''),
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

	it('percent-encodes a rotated session id so the # survives as a URL, not a fragment', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ thread: { id: 'x' }, executions: [] });

		await getThreadDetail(restApiContext, 'project-1', 'agent-1', 'agent-1:chat:bot-1-2#1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			restApiContext,
			'GET',
			'/projects/project-1/agents/v2/agent-1/threads/agent-1%3Achat%3Abot-1-2%231',
		);
	});

	it('stops a session with encoded path segments', async () => {
		const response = { cancelRequested: true };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(response);

		const result = await stopSession(restApiContext, 'project/1', 'agent/1', 'chat:thread#1');

		expect(makeRestApiRequest).toHaveBeenCalledExactlyOnceWith(
			restApiContext,
			'POST',
			'/projects/project%2F1/agents/v2/agent%2F1/threads/chat%3Athread%231/stop',
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
