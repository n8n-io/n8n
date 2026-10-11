import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { N8nApiError } from '../clients/n8n-client';
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
		deleteFolder: vi.fn().mockResolvedValue(undefined),
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

describe('cleanupBuild seeded folders', () => {
	it('deletes the seeded root folders after the workflows', async () => {
		const { client, mocks } = makeClient();
		const build: BuildResult = { ...makeBuild(), createdFolderIds: ['F-root-1', 'F-root-2'] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(true);

		expect(mocks.deleteFolder.mock.calls).toEqual([
			['project-1', 'F-root-1'],
			['project-1', 'F-root-2'],
		]);
		// A folder delete archives what it still holds, so the workflows go first.
		expect(mocks.deleteWorkflow.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.deleteFolder.mock.invocationCallOrder[0],
		);
	});

	it('reports not clean when a folder delete fails, and still deletes the thread', async () => {
		const { client, mocks } = makeClient({
			deleteFolder: vi.fn().mockRejectedValue(new Error('HTTP 404')),
		});
		const build: BuildResult = { ...makeBuild(), createdFolderIds: ['F1'] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(false);

		expect(mocks.deleteThread).toHaveBeenCalledWith('T1');
	});

	it('leaves the folders for the retry when a workflow delete failed', async () => {
		// A folder delete archives the workflows still inside and moves them to the
		// root. The retry would then find no folder and never complete.
		const { client, mocks } = makeClient({
			deleteWorkflow: vi.fn().mockRejectedValue(new Error('HTTP 502')),
		});
		const build: BuildResult = { ...makeBuild(), createdFolderIds: ['F1'] };

		await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(false);

		expect(mocks.deleteFolder).not.toHaveBeenCalled();
		expect(mocks.deleteDataTable).toHaveBeenCalledWith('project-1', 'DT1');
	});

	it.each([
		['403, the status a globally scoped user gets', 403],
		['404, the status a member gets', 404],
	])(
		'still deletes the folders on a retry whose workflows are already gone (%s)',
		async (_label, status) => {
			// The end-of-run retry re-runs cleanupBuild on the same build, so a workflow
			// the first pass deleted is already gone now. That is the state the cleanup
			// wants, not a failure: gating the folders on it would leak them for good.
			// A single transient 502 on one delete is enough to reach this.
			const { client, mocks } = makeClient({
				deleteWorkflow: vi.fn().mockRejectedValue(new N8nApiError(`HTTP ${status}`, status)),
			});
			const build: BuildResult = { ...makeBuild(), createdFolderIds: ['F1'] };

			await expect(cleanupBuild(client, build, silentLogger)).resolves.toBe(true);

			expect(mocks.deleteFolder).toHaveBeenCalledWith('project-1', 'F1');
		},
	);

	it('does not report a clean folder cleanup when the project lookup failed', async () => {
		// The retry exists for exactly this leak; a "Cleaned up" line would hide it.
		const { client } = makeClient({
			getPersonalProjectId: vi.fn().mockRejectedValue(new Error('HTTP 503')),
		});
		const lines: string[] = [];
		const logger: EvalLogger = { ...silentLogger, verbose: (line: string) => lines.push(line) };
		const build: BuildResult = { ...makeBuild(), createdFolderIds: ['F1'] };

		await expect(cleanupBuild(client, build, logger)).resolves.toBe(false);

		expect(lines.some((line) => line.includes('Cleaned up') && line.includes('folder'))).toBe(
			false,
		);
		expect(lines).toContainEqual(
			expect.stringContaining('Could not clean up every one of 1 folder(s)'),
		);
	});

	it('touches no folder API for a build without seeded folders', async () => {
		const { client, mocks } = makeClient();

		await cleanupBuild(client, makeBuild(), silentLogger);

		expect(mocks.deleteFolder).not.toHaveBeenCalled();
	});
});
