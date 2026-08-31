import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import type { BuildResult } from '../harness/build-workflow';
import { cleanupBuild } from '../harness/cleanup';
import type { EvalLogger } from '../harness/logger';

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
		deleteProject: vi.fn().mockResolvedValue(undefined),
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

	it('deletes a seeded agent the live turn never touched', async () => {
		// No `build-agent` call means no `agent-spawned` event and so no artifact ref —
		// without the seed's own id the restored agent would leak into the shared project.
		const { client, mocks } = makeClient({ deleteAgent: vi.fn().mockResolvedValue(undefined) });
		const build = { ...makeBuild(), createdAgentIds: ['seeded-agent-1'] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(true);

		expect(mocks.deleteAgent).toHaveBeenCalledExactlyOnceWith('project-1', 'seeded-agent-1');
	});

	it('deletes a seeded agent the live turn edited exactly once', async () => {
		// The live turn republishes `agent-spawned` for the agent it edits, so a seeded
		// agent shows up in both places; deleting twice would report not-clean on the 404.
		const { client, mocks } = makeClient({ deleteAgent: vi.fn().mockResolvedValue(undefined) });
		const build = {
			...makeBuild(),
			artifactRefs: [{ type: 'agent' as const, id: 'seeded-agent-1' }],
			createdAgentIds: ['seeded-agent-1'],
		};

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(true);

		expect(mocks.deleteAgent).toHaveBeenCalledExactlyOnceWith('project-1', 'seeded-agent-1');
	});

	it('deletes each seeded project, after the artifacts that live inside it', async () => {
		// Ordering is the load-bearing part, not just the call. Deleting a project
		// CASCADES to its contents, so a project torn down before the workflows would
		// take them with it — every later `deleteWorkflow` 404s and the run reports
		// not-clean for artifacts that were in fact cleaned up.
		const { client, mocks } = makeClient();
		const build = { ...makeBuild(), createdProjectIds: ['seeded-1', 'seeded-2'] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(true);

		expect(mocks.deleteProject.mock.calls).toEqual([['seeded-1'], ['seeded-2']]);
		expect(mocks.deleteProject.mock.invocationCallOrder[0]).toBeGreaterThan(
			mocks.deleteWorkflow.mock.invocationCallOrder[0],
		);
		expect(mocks.deleteProject.mock.invocationCallOrder[0]).toBeGreaterThan(
			mocks.deleteDataTable.mock.invocationCallOrder[0],
		);
		expect(mocks.deleteThread).toHaveBeenCalledWith('T1');
	});

	it('reports not clean when a project deletion fails, and still deletes the rest', async () => {
		// A seeded project is instance-level, so a leak outlives the run and leaves a second
		// same-named project the next run's agent has to disambiguate. The caller needs
		// the false to know it should retry.
		const { client, mocks } = makeClient({
			deleteProject: vi
				.fn()
				.mockRejectedValueOnce(new Error('HTTP 502'))
				.mockResolvedValue(undefined),
		});
		const build = { ...makeBuild(), createdProjectIds: ['seeded-1', 'seeded-2'] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(false);

		expect(mocks.deleteProject.mock.calls).toEqual([['seeded-1'], ['seeded-2']]);
		expect(mocks.deleteThread).toHaveBeenCalledWith('T1');
	});

	it('never calls deleteProject for a build that seeded none', async () => {
		// `createdProjectIds` is optional — every case that seeds no project must not
		// reach the project API at all.
		const { client, mocks } = makeClient();

		await expect(cleanupBuild(client, makeBuild(), silentLogger)).resolves.toBe(true);

		expect(mocks.deleteProject).not.toHaveBeenCalled();
	});
});
