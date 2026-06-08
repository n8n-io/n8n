import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { buildWorkflow } from '../harness/runner';

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('buildWorkflow thread IDs', () => {
	it('uses UUID thread IDs accepted by the instance-ai thread endpoint', async () => {
		let capturedThreadId = '';
		const client = {
			ensureThread: vi.fn(async (threadId: string) => {
				capturedThreadId = threadId;
				await Promise.resolve();
				throw new Error('stop after ensureThread');
			}),
		} as unknown as N8nClient;

		await buildWorkflow({
			client,
			conversation: [{ role: 'user', text: 'build a workflow' }],
			preRunWorkflowIds: new Set(),
			claimedWorkflowIds: new Set(),
			logger: silentLogger,
		});

		expect(client.ensureThread).toHaveBeenCalledTimes(1);
		expect(capturedThreadId).toMatch(uuidV4Pattern);
	});
});
