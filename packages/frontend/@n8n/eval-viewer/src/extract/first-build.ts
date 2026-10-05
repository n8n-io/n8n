/** Per-build first-build facts, ported from firstbuild.py so both give the same numbers. */
import type { FirstBuild } from '../schema';
import { isToolCallStep, type TestCase, type TranscriptTurn } from './inputs';

/** Scenario runs firstbuild.py leaves out: they count as neither passed nor failed. */
const FIRST_BUILD_EXCLUDED = new Set(['framework_issue', 'build_timeout']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Scenario pass flags of a test case by the workflow they ran on. */
export function scenarioPassesByWorkflow(testCase: TestCase): Map<string | null, boolean[]> {
	const byWorkflow = new Map<string | null, boolean[]>();
	for (const scenario of testCase.scenarios ?? []) {
		for (const run of scenario.runs) {
			if (FIRST_BUILD_EXCLUDED.has(run.failureCategory ?? '')) continue;
			const key = run.workflowId ?? null;
			byWorkflow.set(key, [...(byWorkflow.get(key) ?? []), Boolean(run.passed)]);
		}
	}
	return byWorkflow;
}

export function firstBuildOf(
	transcript: TranscriptTurn[],
	passesByWorkflow: Map<string | null, boolean[]>,
): FirstBuild {
	const calls = transcript.flatMap((turn) => turn.steps.filter(isToolCallStep));
	const results = calls
		.filter((call) => call.toolName === 'build-workflow')
		.map((call) => call.result ?? {});
	const oks = results.map((result) => isRecord(result) && result.success === true);
	const firstSuccess = oks.indexOf(true);
	const workflowIds = new Set(
		results.flatMap((result) =>
			isRecord(result) && typeof result.workflowId === 'string' && result.workflowId
				? [result.workflowId]
				: [],
		),
	);
	return {
		firstOk: oks.length > 0 && oks[0],
		oneShot: oks.length === 1 && oks[0],
		callsToFirstSave: firstSuccess < 0 ? null : firstSuccess + 1,
		rebuilds: firstSuccess < 0 ? 0 : oks.length - firstSuccess - 1,
		verifies: calls.filter((call) => call.toolName === 'verify-built-workflow').length,
		scenarioPasses: [...workflowIds].flatMap((id) => passesByWorkflow.get(id) ?? []),
	};
}
