import { wrapSubmitExecuteWithIdentity } from '../submit-workflow-identity';
import type { SubmitWorkflowInput, SubmitWorkflowOutput } from '../submit-workflow.tool';

const ROOT = '/home/daytona/workspace';
const MAIN_PATH = `${ROOT}/src/workflow.ts`;
const CHUNK_PATH = `${ROOT}/src/chunk.ts`;

function resolvePath(rawFilePath: string | undefined): string {
	if (!rawFilePath) return MAIN_PATH;
	if (rawFilePath.startsWith('/')) return rawFilePath;
	return `${ROOT}/${rawFilePath}`;
}

/**
 * Build a fake underlying `execute` that:
 *   - On a call without `workflowId`, returns a freshly-minted id (simulating create).
 *   - On a call with `workflowId`, returns that same id (simulating update).
 *   - Records every call it received.
 * An optional `gate` promise lets tests hold dispatch mid-flight to exercise races.
 */
function makeUnderlying(opts: { idPrefix?: string; gate?: Promise<void> } = {}) {
	const prefix = opts.idPrefix ?? 'wf';
	let counter = 0;
	const calls: SubmitWorkflowInput[] = [];

	const execute = async (input: SubmitWorkflowInput): Promise<SubmitWorkflowOutput> => {
		calls.push({ ...input });
		if (opts.gate) await opts.gate;
		if (input.workflowId) {
			return { success: true, workflowId: input.workflowId };
		}
		counter += 1;
		return { success: true, workflowId: `${prefix}_${counter}` };
	};

	return { execute, calls };
}

describe('wrapSubmitExecuteWithIdentity', () => {
	it('parallel submits for the same filePath produce one create and N-1 updates sharing the workflowId', async () => {
		let release: () => void = () => {};
		const gate = new Promise<void>((res) => {
			release = res;
		});
		const { execute, calls } = makeUnderlying({ gate });
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		const inFlight = Array.from({ length: 5 }, async () => await wrapped({}));
		// Let the dispatcher land first, then release.
		await Promise.resolve();
		release();

		const results = await Promise.all(inFlight);

		const ids = results.map((r) => r.workflowId);
		expect(new Set(ids).size).toBe(1);
		expect(results.every((r) => r.success)).toBe(true);

		const createCalls = calls.filter((c) => !c.workflowId);
		const updateCalls = calls.filter((c) => c.workflowId);
		expect(createCalls).toHaveLength(1);
		expect(updateCalls).toHaveLength(4);
		expect(updateCalls.every((c) => c.workflowId === ids[0])).toBe(true);
	});

	it('sequential submits for the same filePath reuse the bound workflowId', async () => {
		const { execute, calls } = makeUnderlying();
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		const first = await wrapped({});
		const second = await wrapped({});

		expect(first.workflowId).toBe('wf_1');
		expect(second.workflowId).toBe('wf_1');
		expect(calls).toHaveLength(2);
		expect(calls[0].workflowId).toBeUndefined();
		expect(calls[1].workflowId).toBe('wf_1');
	});

	it('overrides an LLM-supplied workflowId once the wrapper has bound one', async () => {
		const { execute, calls } = makeUnderlying();
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		const first = await wrapped({});
		const second = await wrapped({ workflowId: 'llm_hallucinated_id' });

		expect(first.workflowId).toBe('wf_1');
		expect(second.workflowId).toBe('wf_1');
		expect(calls[1].workflowId).toBe('wf_1');
	});

	it('different filePaths dispatch independently (chunk + main composition)', async () => {
		const { execute, calls } = makeUnderlying();
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		const [mainResult, chunkResult] = await Promise.all([
			wrapped({ filePath: MAIN_PATH }),
			wrapped({ filePath: CHUNK_PATH }),
		]);

		expect(mainResult.workflowId).not.toBe(chunkResult.workflowId);
		const createCalls = calls.filter((c) => !c.workflowId);
		expect(createCalls).toHaveLength(2);

		const mainAgain = await wrapped({ filePath: MAIN_PATH });
		expect(mainAgain.workflowId).toBe(mainResult.workflowId);

		const chunkAgain = await wrapped({ filePath: CHUNK_PATH });
		expect(chunkAgain.workflowId).toBe(chunkResult.workflowId);
	});

	it('resolves differently-spelled paths to the same identity', async () => {
		const { execute } = makeUnderlying();
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		const absolute = await wrapped({ filePath: MAIN_PATH });
		const relative = await wrapped({ filePath: 'src/workflow.ts' });
		const defaulted = await wrapped({});

		expect(absolute.workflowId).toBe('wf_1');
		expect(relative.workflowId).toBe('wf_1');
		expect(defaulted.workflowId).toBe('wf_1');
	});

	it('clears the map when the first dispatch fails so subsequent calls can retry', async () => {
		let call = 0;
		const execute = async (input: SubmitWorkflowInput): Promise<SubmitWorkflowOutput> => {
			await Promise.resolve();
			call += 1;
			if (call === 1) {
				return { success: false, errors: ['transient failure'] };
			}
			if (input.workflowId) return { success: true, workflowId: input.workflowId };
			return { success: true, workflowId: 'wf_recovered' };
		};
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		const failed = await wrapped({});
		expect(failed.success).toBe(false);

		const retried = await wrapped({});
		expect(retried.success).toBe(true);
		expect(retried.workflowId).toBe('wf_recovered');
	});

	it('reports a failure to concurrent waiters when the dispatcher fails', async () => {
		let release: () => void = () => {};
		const gate = new Promise<void>((res) => {
			release = res;
		});
		let call = 0;
		const execute = async (): Promise<SubmitWorkflowOutput> => {
			call += 1;
			await gate;
			if (call === 1) return { success: false, errors: ['create failed'] };
			return { success: true, workflowId: 'wf_unused' };
		};
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		const a = wrapped({});
		const b = wrapped({});
		await Promise.resolve();
		release();

		const [aResult, bResult] = await Promise.all([a, b]);
		expect(aResult.success).toBe(false);
		expect(bResult.success).toBe(false);
		expect(bResult.errors?.[0]).toContain('Previous submit-workflow for this file failed');
	});

	it('propagates thrown errors from the dispatcher and clears the map', async () => {
		let call = 0;
		const execute = async (input: SubmitWorkflowInput): Promise<SubmitWorkflowOutput> => {
			await Promise.resolve();
			call += 1;
			if (call === 1) throw new Error('boom');
			if (input.workflowId) return { success: true, workflowId: input.workflowId };
			return { success: true, workflowId: 'wf_after_throw' };
		};
		const wrapped = wrapSubmitExecuteWithIdentity(execute, resolvePath);

		await expect(wrapped({})).rejects.toThrow('boom');

		const retried = await wrapped({});
		expect(retried.workflowId).toBe('wf_after_throw');
	});
});
