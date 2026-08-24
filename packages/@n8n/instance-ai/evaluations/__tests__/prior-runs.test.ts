import type { InstanceAiEvalSeedWorkflow } from '@n8n/api-types';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { executePriorRuns } from '../harness/prior-runs';

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const wf = (name: string) => ({ id: `${name}-id-12345678`, name }) as InstanceAiEvalSeedWorkflow;

/** Typed so `.mock.calls` is not `any[]` — the assertions read call args directly. */
type ExecFn = (
	workflowId: string,
	hints?: string,
	timeoutMs?: number,
) => Promise<{ success: boolean; errors: string[] }>;

function makeClient(executeWithLlmMock: Mock<ExecFn>): N8nClient {
	return { executeWithLlmMock } as unknown as N8nClient;
}

const ok = { success: true, errors: [] };
const failed = { success: false, errors: ['Fetch Orders: request failed with 500'] };

describe('executePriorRuns', () => {
	it('does nothing when a case declares none', async () => {
		const exec: Mock<ExecFn> = vi.fn();
		const out = await executePriorRuns(makeClient(exec), [], [], [], silentLogger);
		expect(out).toEqual([]);
		expect(exec).not.toHaveBeenCalled();
	});

	it('runs the workflow named by the case, resolving name to real id', async () => {
		// Names are the authoring handle; ids are minted at seed time, so the mapping is
		// the whole job. Running the wrong workflow would seed the wrong history silently.
		const exec: Mock<ExecFn> = vi.fn().mockResolvedValue(ok);
		const out = await executePriorRuns(
			makeClient(exec),
			[{ workflow: 'Nightly Sync', hints: 'the HTTP call returns 500' }],
			[wf('Daily Digest'), wf('Nightly Sync')],
			['id-digest', 'id-nightly'],
			silentLogger,
		);
		expect(exec).toHaveBeenCalledTimes(1);
		expect(exec.mock.calls[0][0]).toBe('id-nightly');
		expect(exec.mock.calls[0][1]).toBe('the HTTP call returns 500');
		expect(out).toEqual([
			{ workflow: 'Nightly Sync', workflowId: 'id-nightly', success: true, errors: [] },
		]);
	});

	it('reports a failed run without throwing', async () => {
		// A red prior run is usually the point: the case establishes that last night broke,
		// then asks only "it broke again". Throwing here would make the setup unusable.
		const exec: Mock<ExecFn> = vi.fn().mockResolvedValue(failed);
		const out = await executePriorRuns(
			makeClient(exec),
			[{ workflow: 'Nightly Sync' }],
			[wf('Nightly Sync')],
			['id-nightly'],
			silentLogger,
		);
		expect(out[0].success).toBe(false);
		expect(out[0].errors).toEqual(['Fetch Orders: request failed with 500']);
	});

	it('refuses when ids cannot be mapped to names', async () => {
		// restoreThread returns ids in input order, so a length mismatch means the mapping
		// is unsafe — running the wrong workflow is worse than not running.
		const exec: Mock<ExecFn> = vi.fn();
		await expect(
			executePriorRuns(
				makeClient(exec),
				[{ workflow: 'Nightly Sync' }],
				[wf('Nightly Sync'), wf('Daily Digest')],
				['only-one-id'],
				silentLogger,
			),
		).rejects.toThrow(/2 workflow\(s\) but got 1 id/);
		expect(exec).not.toHaveBeenCalled();
	});

	it('refuses a name that was not seeded', async () => {
		const exec: Mock<ExecFn> = vi.fn();
		await expect(
			executePriorRuns(
				makeClient(exec),
				[{ workflow: 'Does Not Exist' }],
				[wf('Nightly Sync')],
				['id-nightly'],
				silentLogger,
			),
		).rejects.toThrow(/was not seeded/);
	});

	it('retries a transient abort, then reports the settled result', async () => {
		const exec: Mock<ExecFn> = vi
			.fn()
			// A real transient shape per `isTransientExecutionAbort` — an eval-DB race that
			// aborts before any node runs, not a workflow defect.
			.mockResolvedValueOnce({
				success: false,
				errors: ['SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'],
			})
			.mockResolvedValueOnce(ok);
		const out = await executePriorRuns(
			makeClient(exec),
			[{ workflow: 'Nightly Sync' }],
			[wf('Nightly Sync')],
			['id-nightly'],
			silentLogger,
		);
		expect(exec).toHaveBeenCalledTimes(2);
		expect(out[0].success).toBe(true);
	});

	it('does not retry a genuine execution failure', async () => {
		// Only transient infrastructure aborts are retried. Re-running a legitimately red
		// workflow would waste minutes and could flip the very state the case wants.
		const exec: Mock<ExecFn> = vi.fn().mockResolvedValue(failed);
		await executePriorRuns(
			makeClient(exec),
			[{ workflow: 'Nightly Sync' }],
			[wf('Nightly Sync')],
			['id-nightly'],
			silentLogger,
		);
		expect(exec).toHaveBeenCalledTimes(1);
	});

	it('runs several prior runs in declared order', async () => {
		const exec: Mock<ExecFn> = vi.fn().mockResolvedValue(ok);
		await executePriorRuns(
			makeClient(exec),
			[{ workflow: 'B' }, { workflow: 'A' }],
			[wf('A'), wf('B')],
			['id-a', 'id-b'],
			silentLogger,
		);
		expect(exec.mock.calls.map((c) => c[0])).toEqual(['id-b', 'id-a']);
	});
});
