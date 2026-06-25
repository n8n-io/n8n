import { noExcessiveBuildFailures } from './no-excessive-build-failures';
import type { WorkflowResponse } from '../../clients/n8n-client';
import type { TranscriptStep, TranscriptTurn } from '../../types';
import { failedBuildsPerTurn } from '../../utils/conversation-text';

const wf: WorkflowResponse = {
	id: 'wf',
	name: 'x',
	active: false,
	versionId: 'v',
	nodes: [],
	connections: {},
};

const bw = (): TranscriptStep => ({ kind: 'tool-call', toolName: 'build-workflow' });
const bwOk = (): TranscriptStep => ({
	kind: 'tool-call',
	toolName: 'build-workflow',
	result: { success: true },
});
const bwFail = (): TranscriptStep => ({
	kind: 'tool-call',
	toolName: 'build-workflow',
	result: { success: false, errors: ['nope'] },
});
const bwErr = (): TranscriptStep => ({
	kind: 'tool-call',
	toolName: 'build-workflow',
	error: 'boom',
});
const approval = (): TranscriptStep => ({
	kind: 'confirmation',
	toolName: 'build-workflow',
	resumeReason: 'approval',
	approved: true,
});
const turn = (steps: TranscriptStep[]): TranscriptTurn => ({ userMessage: 'do it', steps });

describe('failedBuildsPerTurn (the deterministic check signal)', () => {
	it('counts only FAILED builds (success:false / errors / error), not successes', () => {
		expect(failedBuildsPerTurn([turn([bwOk()])])).toEqual([0]);
		expect(failedBuildsPerTurn([turn([bwFail()])])).toEqual([1]);
		expect(failedBuildsPerTurn([turn([bwErr()])])).toEqual([1]);
		expect(failedBuildsPerTurn([turn([bwOk(), bwFail(), bwFail()])])).toEqual([2]);
	});

	it('does not count a successful build or an approval round-trip', () => {
		expect(failedBuildsPerTurn([turn([bw(), approval()])])).toEqual([0]);
	});

	it('counts per turn', () => {
		expect(failedBuildsPerTurn([turn([bwFail(), bwFail()]), turn([bwFail()])])).toEqual([2, 1]);
	});
});

describe('noExcessiveBuildFailures', () => {
	async function run(failed?: number[]) {
		return await noExcessiveBuildFailures.run(wf, {
			prompt: 'p',
			...(failed ? { failedBuildsPerTurn: failed } : {}),
		});
	}

	it('passes with no failed builds', async () => {
		expect(await run([0])).toEqual({ pass: true });
	});

	it('passes up to four failed builds in a turn', async () => {
		expect(await run([3, 4])).toEqual({ pass: true });
	});

	it('fails at five or more failed builds in a turn', async () => {
		const result = await run([5]);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('repeatedly failed to build');
	});

	it('fails on the worst turn of a multi-turn run', async () => {
		expect((await run([0, 5, 1])).pass).toBe(false);
	});

	it('is N/A with no transcript data', async () => {
		expect(await run(undefined)).toEqual({ pass: true, applicable: false });
	});

	it('is N/A with an empty transcript', async () => {
		expect(await run([])).toEqual({ pass: true, applicable: false });
	});
});
