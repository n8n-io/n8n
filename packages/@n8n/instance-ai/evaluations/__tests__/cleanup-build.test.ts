import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { cleanupBuild } from '../harness/runner';
import type { BuildResult } from '../harness/runner';

/**
 * Locks in the cleanupBuild contract the CLI's per-case cleanup relies on:
 * the return value reports whether every deletion succeeded, so a caller can
 * keep the build cached and retry a transiently failed cleanup later.
 */

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function makeClient(overrides: Partial<Record<keyof N8nClient, Mock>> = {}): {
	client: N8nClient;
	mocks: Record<string, Mock>;
} {
	const mocks: Record<string, Mock> = {
		deleteWorkflow: vi.fn().mockResolvedValue(undefined),
		deleteDataTable: vi.fn().mockResolvedValue(undefined),
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		deleteThread: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
	return { client: mocks as unknown as N8nClient, mocks };
}

function makeBuild(): BuildResult {
	return {
		success: true,
		workflowJsons: [],
		createdWorkflowIds: ['W1'],
		createdDataTableIds: ['DT1'],
		threadId: 'T1',
	};
}

describe('cleanupBuild', () => {
	it('deletes workflows, data tables and the thread, and reports clean', async () => {
		const { client, mocks } = makeClient();

		await expect(cleanupBuild(client, makeBuild(), silentLogger)).resolves.toBe(true);

		expect(mocks.deleteWorkflow).toHaveBeenCalledWith('W1');
		expect(mocks.deleteDataTable).toHaveBeenCalledWith('project-1', 'DT1');
		expect(mocks.deleteThread).toHaveBeenCalledWith('T1');
	});

	it('reports not clean when a deletion fails, but still attempts the rest', async () => {
		const { client, mocks } = makeClient({
			deleteWorkflow: vi.fn().mockRejectedValue(new Error('HTTP 502')),
		});

		await expect(cleanupBuild(client, makeBuild(), silentLogger)).resolves.toBe(false);

		expect(mocks.deleteDataTable).toHaveBeenCalledWith('project-1', 'DT1');
		expect(mocks.deleteThread).toHaveBeenCalledWith('T1');
	});

	it('deletes the built agent of an agent-anchored build', async () => {
		const { client, mocks } = makeClient({ deleteAgent: vi.fn().mockResolvedValue(undefined) });
		const build = { ...makeBuild(), artifactRefs: [{ type: 'agent' as const, id: 'agent-1' }] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(true);

		expect(mocks.deleteAgent).toHaveBeenCalledWith('project-1', 'agent-1');
	});

	it('reports not clean when the agent deletion fails, so the caller can retry', async () => {
		const { client, mocks } = makeClient({
			deleteAgent: vi.fn().mockRejectedValue(new Error('HTTP 502')),
		});
		const build = { ...makeBuild(), artifactRefs: [{ type: 'agent' as const, id: 'agent-1' }] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(false);

		// The remaining artifacts are still cleaned up.
		expect(mocks.deleteDataTable).toHaveBeenCalledWith('project-1', 'DT1');
		expect(mocks.deleteThread).toHaveBeenCalledWith('T1');
	});

	it('never calls deleteAgent for a build without an agent ref', async () => {
		const { client, mocks } = makeClient({ deleteAgent: vi.fn() });

		await expect(cleanupBuild(client, makeBuild(), silentLogger)).resolves.toBe(true);

		expect(mocks.deleteAgent).not.toHaveBeenCalled();
	});
});
