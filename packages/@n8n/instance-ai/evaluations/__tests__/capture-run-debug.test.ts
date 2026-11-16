import { describe, expect, it, vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { captureThreadRunDebug } from '../harness/capture-run-debug';

describe('captureThreadRunDebug', () => {
	it('fetches full run records for each summary', async () => {
		const client = {
			listThreadDebugRuns: vi.fn().mockResolvedValue({
				threadId: 'thread-1',
				runs: [
					{
						runId: 'run-1',
						threadId: 'thread-1',
						startedAt: 1,
						stepCount: 1,
						workflowCodeCount: 0,
						label: 'Build workflow',
					},
				],
			}),
			getRunDebug: vi.fn().mockResolvedValue({
				threadId: 'thread-1',
				runId: 'run-1',
				startedAt: 1,
				steps: [{ stepNumber: 0, input: { system: 'prompt' } }],
				workflowCode: [],
			}),
			assistantAgents: () => undefined,
		} as unknown as N8nClient;

		const records = await captureThreadRunDebug(client, 'thread-1');

		expect(records).toHaveLength(1);
		expect(records[0]?.label).toBe('Build workflow');
		expect(records[0]?.steps).toHaveLength(1);
		// Per-request timeout so a stalled call releases its socket.
		expect(client.getRunDebug).toHaveBeenCalledWith('run-1', expect.any(Number));
	});

	it('returns an empty array when the debug API is unavailable', async () => {
		const client = {
			listThreadDebugRuns: vi
				.fn()
				.mockRejectedValue(
					new Error('n8n API GET /rest/instance-ai/debug/threads/t/runs failed (404): not found'),
				),
			assistantAgents: () => undefined,
		} as unknown as N8nClient;

		await expect(captureThreadRunDebug(client, 'thread-1')).resolves.toEqual([]);
	});

	it('reads the usage route on the Agents runtime instead of run debug', async () => {
		const total = {
			promptTokens: 100,
			completionTokens: 10,
			totalTokens: 110,
			cacheReadTokens: 40,
			cacheWriteTokens: 0,
			cost: 0.001,
		};
		const getUsage = vi.fn().mockResolvedValue({
			executions: [
				{
					...total,
					executionId: 'exec-1',
					threadId: 'thread-1',
					parentExecutionId: null,
					status: 'success',
					model: null,
					startedAt: null,
					stoppedAt: null,
					duration: 0,
					descendants: [],
					total,
				},
			],
			total,
		});
		const client = {
			listThreadDebugRuns: vi.fn(),
			assistantAgents: () => ({ getUsage }),
		} as unknown as N8nClient;

		const records = await captureThreadRunDebug(client, 'thread-1');

		expect(getUsage).toHaveBeenCalledWith('thread-1', expect.any(Number));
		expect(client.listThreadDebugRuns).not.toHaveBeenCalled();
		expect(records.map((record) => record.runId)).toEqual(['exec-1']);
		expect(records[0]?.steps[0]?.output).toMatchObject({
			usage: { inputTokens: 100, outputTokens: 10, inputTokenDetails: { cacheReadTokens: 40 } },
			costUsd: 0.001,
		});
	});
});
