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
		} as unknown as N8nClient;

		await expect(captureThreadRunDebug(client, 'thread-1')).resolves.toEqual([]);
	});
});
