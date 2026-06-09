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
	it('uses UUID thread IDs and the personal project for the instance-ai thread endpoint', async () => {
		let capturedThreadId = '';
		let capturedProjectId = '';
		const client = {
			getPersonalProjectId: vi.fn(async () => await Promise.resolve('project-1')),
			ensureThread: vi.fn(async (threadId: string, projectId: string) => {
				capturedThreadId = threadId;
				capturedProjectId = projectId;
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

		expect(client.getPersonalProjectId).toHaveBeenCalledTimes(1);
		expect(client.ensureThread).toHaveBeenCalledTimes(1);
		expect(capturedThreadId).toMatch(uuidV4Pattern);
		expect(capturedProjectId).toBe('project-1');
	});
});
