import type { AgentAvatarKind } from '../components/AgentAvatar.vue';

/**
 * The re-run of a test saved from the test chat, as the runner leaves it on
 * the result (`output.rerun`, see `rerun-outcome.ts` on the server). A pass and
 * a fail are judgments; "flaky" and "couldn't check" are neither and are not
 * counted with them.
 */
export type SavedTestKind = 'answer' | 'note';
export type SavedTestOutcome = 'pass' | 'fail' | 'flaky' | 'couldnt_check';

export interface ToolCountChange {
	tool: string;
	saved: number;
	now: number;
}

export interface SavedTestRerun {
	kind: SavedTestKind;
	outcome: SavedTestOutcome;
	runs: number;
	failedRuns: number;
	toolChanges: ToolCountChange[];
	reasoning: string | null;
	offScriptTools: string[];
}

const OUTCOMES: readonly SavedTestOutcome[] = ['pass', 'fail', 'flaky', 'couldnt_check'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOutcome(value: unknown): value is SavedTestOutcome {
	return OUTCOMES.includes(value as SavedTestOutcome);
}

function readToolChanges(value: unknown): ToolCountChange[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) =>
		isRecord(entry) &&
		typeof entry.tool === 'string' &&
		typeof entry.saved === 'number' &&
		typeof entry.now === 'number'
			? [{ tool: entry.tool, saved: entry.saved, now: entry.now }]
			: [],
	);
}

/** Null for a result that is not the re-run of a saved test. */
export function readSavedTestRerun(output: unknown): SavedTestRerun | null {
	if (!isRecord(output) || !isRecord(output.rerun)) return null;
	const rerun = output.rerun;
	if (!isOutcome(rerun.outcome)) return null;
	if (typeof rerun.runs !== 'number' || typeof rerun.failedRuns !== 'number') return null;
	return {
		kind: rerun.kind === 'note' ? 'note' : 'answer',
		outcome: rerun.outcome,
		runs: rerun.runs,
		failedRuns: rerun.failedRuns,
		toolChanges: readToolChanges(rerun.toolChanges),
		reasoning: typeof rerun.reasoning === 'string' ? rerun.reasoning : null,
		offScriptTools: Array.isArray(rerun.offScriptTools)
			? rerun.offScriptTools.filter((tool): tool is string => typeof tool === 'string')
			: [],
	};
}

export function rerunAvatarKind(rerun: SavedTestRerun): AgentAvatarKind {
	if (rerun.outcome === 'pass') return 'pass';
	if (rerun.outcome === 'fail') return 'work';
	return 'idle';
}
