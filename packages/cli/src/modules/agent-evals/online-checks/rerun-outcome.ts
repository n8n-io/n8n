import type { PinnedToolCall } from './saved-test-case';

/**
 * How a re-run of a saved test decides, kept apart from the runner so the
 * rules can be read and tested on their own. See "Noise in re-runs" in the
 * plan: compare the tool calls in code first, use the judge only for the
 * words, and run again only where a result changed.
 */

/** A first run that fails gets up to two more. "Fail" needs every run to fail. */
export const MAX_RERUN_ATTEMPTS = 3;

/**
 * `answer`: saved with "Looks right"; it passes while the reply means the same.
 * `note`: saved with "Not right" and a note; it passes once the note is met.
 */
export type SavedTestKind = 'answer' | 'note';

export interface ToolCountChange {
	tool: string;
	saved: number;
	now: number;
}

export interface RerunAttempt {
	/** Reads the saved test had no data for. Any of them makes the run unreadable. */
	offScriptTools: string[];
	toolChanges: ToolCountChange[];
	judge: 'pass' | 'fail' | 'error' | 'skipped';
	reasoning: string | null;
}

export type AttemptResult = 'pass' | 'fail' | 'unknown';

export type RerunOutcome = 'pass' | 'fail' | 'flaky' | 'couldnt_check';

export interface RerunDecision {
	outcome: RerunOutcome;
	runs: number;
	failedRuns: number;
	toolChanges?: ToolCountChange[];
	reasoning?: string | null;
	offScriptTools?: string[];
}

function countByTool(tools: Iterable<string>, ownTools: ReadonlySet<string>) {
	const counts = new Map<string, number>();
	for (const tool of tools) {
		if (ownTools.has(tool)) counts.set(tool, (counts.get(tool) ?? 0) + 1);
	}
	return counts;
}

/**
 * How often the run called each of the agent's own tools, against the saved
 * run. Built-in tools are left out: the saved data leaves them out too.
 */
export function compareToolCalls(
	saved: readonly PinnedToolCall[],
	runTools: readonly string[],
	ownTools: ReadonlySet<string>,
): ToolCountChange[] {
	const before = countByTool(
		saved.map((call) => call.tool),
		ownTools,
	);
	const after = countByTool(runTools, ownTools);
	const tools = [...new Set([...before.keys(), ...after.keys()])].sort();
	return tools.flatMap((tool) => {
		const savedCount = before.get(tool) ?? 0;
		const now = after.get(tool) ?? 0;
		return savedCount === now ? [] : [{ tool, saved: savedCount, now }];
	});
}

export function attemptResult(kind: SavedTestKind, attempt: RerunAttempt): AttemptResult {
	if (attempt.offScriptTools.length > 0) return 'unknown';
	// The saved run of a note test is the wrong one, so moving away from its
	// tool calls is not a failure.
	if (kind === 'answer' && attempt.toolChanges.length > 0) return 'fail';
	if (attempt.judge === 'pass') return 'pass';
	if (attempt.judge === 'fail') return 'fail';
	return 'unknown';
}

export function needsAnotherRun(kind: SavedTestKind, attempts: readonly RerunAttempt[]): boolean {
	if (attempts.length === 0) return true;
	if (attempts.length >= MAX_RERUN_ATTEMPTS) return false;
	return attempts.every((attempt) => attemptResult(kind, attempt) === 'fail');
}

export function decideOutcome(
	kind: SavedTestKind,
	attempts: readonly RerunAttempt[],
): RerunDecision {
	const results = attempts.map((attempt) => attemptResult(kind, attempt));
	const runs = attempts.length;
	const failed = attempts.filter((_, index) => results[index] === 'fail');
	const failedRuns = failed.length;

	const unreadable = attempts.find((_, index) => results[index] === 'unknown');
	if (unreadable) {
		return {
			outcome: 'couldnt_check',
			runs,
			failedRuns,
			offScriptTools: unreadable.offScriptTools,
			reasoning: unreadable.offScriptTools.length > 0 ? null : unreadable.reasoning,
		};
	}
	if (failedRuns === 0) return { outcome: 'pass', runs, failedRuns };

	const evidence = {
		toolChanges: failed[0].toolChanges,
		reasoning: failed.find((attempt) => attempt.reasoning)?.reasoning ?? null,
	};
	if (failedRuns === runs) return { outcome: 'fail', runs, failedRuns, ...evidence };
	return { outcome: 'flaky', runs, failedRuns, ...evidence };
}
