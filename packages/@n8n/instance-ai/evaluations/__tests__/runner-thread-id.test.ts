import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import type { EvalLogger } from '../harness/logger';

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

	it('uses the thread ID that the caller supplies', async () => {
		const threadId = '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';
		const client = {
			getPersonalProjectId: vi.fn(async () => await Promise.resolve('project-1')),
			ensureThread: vi.fn(async () => {
				await Promise.resolve();
				throw new Error('stop after ensureThread');
			}),
		} as unknown as N8nClient;

		const result = await buildWorkflow({
			client,
			conversation: [{ role: 'user', text: 'build a workflow' }],
			threadId,
			preRunWorkflowIds: new Set(),
			claimedWorkflowIds: new Set(),
			logger: silentLogger,
		});

		expect(vi.mocked(client.ensureThread).mock.calls[0][0]).toBe(threadId);
		expect(result.threadId).toBe(threadId);
	});

	it('refuses a supplied thread ID that is not a UUID, before any setup', async () => {
		const client = {
			getPersonalProjectId: vi.fn(),
			ensureThread: vi.fn(),
		} as unknown as N8nClient;

		await expect(
			buildWorkflow({
				client,
				conversation: [{ role: 'user', text: 'build a workflow' }],
				threadId: 'case-42',
				preRunWorkflowIds: new Set(),
				claimedWorkflowIds: new Set(),
				logger: silentLogger,
			}),
		).rejects.toThrow('threadId must be a UUID');
		expect(client.getPersonalProjectId).not.toHaveBeenCalled();
		expect(client.ensureThread).not.toHaveBeenCalled();
	});
});
