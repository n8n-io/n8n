// ---------------------------------------------------------------------------
// Trace graders — pure functions over the captured SSE event stream.
//
// These cover the three pain points the eval is built around:
//   - Did the agent propose computer-use at all?
//   - Did it loop / blow its tool-call budget?
//   - Did it use (or avoid) a specific tool when it should have?
// ---------------------------------------------------------------------------

import type {
	GraderResult,
	ScenarioTrace,
	TraceBudgetGrader,
	TraceFinalTextMatchesGrader,
	TraceMustCallMcpServerGrader,
	TraceMustCallToolGrader,
	TraceMustNotCallMcpServerGrader,
	TraceMustNotCallToolGrader,
	TraceMustNotLoopGrader,
} from '../types';
import { isComputerUseTool } from './tool-set';

const DEFAULT_MAX_REPEATED_CALL = 3;

export function gradeMustCallTool(
	trace: ScenarioTrace,
	grader: TraceMustCallToolGrader,
): GraderResult {
	const matched = trace.toolCalls.filter((tc) => tc.toolName.includes(grader.name));
	const pass = matched.length > 0;
	return {
		grader,
		pass,
		reason: pass
			? `tool "${grader.name}" was called ${String(matched.length)} time(s)`
			: `tool "${grader.name}" was never called (saw ${String(trace.toolCalls.length)} other calls)`,
	};
}

export function gradeMustNotCallTool(
	trace: ScenarioTrace,
	grader: TraceMustNotCallToolGrader,
): GraderResult {
	const matched = trace.toolCalls.filter((tc) => tc.toolName.includes(grader.name));
	const pass = matched.length === 0;
	return {
		grader,
		pass,
		reason: pass
			? `tool "${grader.name}" was correctly avoided`
			: `tool "${grader.name}" was called ${String(matched.length)} time(s)`,
	};
}

export function gradeMustCallMcpServer(
	trace: ScenarioTrace,
	grader: TraceMustCallMcpServerGrader,
): GraderResult {
	const cuCalls = trace.toolCalls.filter((tc) => isComputerUseTool(tc.toolName));
	const pass = cuCalls.length > 0;
	const sample = cuCalls
		.slice(0, 3)
		.map((tc) => tc.toolName)
		.join(', ');
	return {
		grader,
		pass,
		reason: pass
			? `${String(cuCalls.length)} computer-use call(s): ${sample}`
			: 'agent never invoked any computer-use tool — likely failed to propose it',
	};
}

export function gradeMustNotCallMcpServer(
	trace: ScenarioTrace,
	grader: TraceMustNotCallMcpServerGrader,
): GraderResult {
	const cuCalls = trace.toolCalls.filter((tc) => isComputerUseTool(tc.toolName));
	const pass = cuCalls.length === 0;
	const sample = cuCalls
		.slice(0, 3)
		.map((tc) => tc.toolName)
		.join(', ');
	return {
		grader,
		pass,
		reason: pass
			? 'agent correctly avoided computer-use'
			: `agent called ${String(cuCalls.length)} computer-use tool(s) when it shouldn't: ${sample}`,
	};
}

export function gradeMustNotLoop(
	trace: ScenarioTrace,
	grader: TraceMustNotLoopGrader,
): GraderResult {
	const max = grader.maxRepeatedCall ?? DEFAULT_MAX_REPEATED_CALL;
	let runLength = 0;
	let prevKey = '';
	let worstRun = 0;
	let worstKey = '';

	for (const tc of trace.toolCalls) {
		const key = `${tc.toolName}:${stableArgs(tc.args)}`;
		if (key === prevKey) {
			runLength += 1;
		} else {
			runLength = 1;
			prevKey = key;
		}
		if (runLength > worstRun) {
			worstRun = runLength;
			worstKey = key;
		}
	}

	const pass = worstRun <= max;
	return {
		grader,
		pass,
		reason: pass
			? `longest identical-call run was ${String(worstRun)} (limit ${String(max)})`
			: `agent looped: ${String(worstRun)} consecutive identical calls of ${worstKey}`,
	};
}

export function gradeBudget(trace: ScenarioTrace, grader: TraceBudgetGrader): GraderResult {
	const failures: string[] = [];
	if (grader.maxToolCalls !== undefined && trace.toolCalls.length > grader.maxToolCalls) {
		failures.push(
			`${String(trace.toolCalls.length)} tool calls > limit ${String(grader.maxToolCalls)}`,
		);
	}
	if (grader.maxDurationMs !== undefined && trace.durationMs > grader.maxDurationMs) {
		failures.push(
			`duration ${String(trace.durationMs)}ms > limit ${String(grader.maxDurationMs)}ms`,
		);
	}
	if (
		grader.maxToolResultTokensEst !== undefined &&
		trace.tokens.totalResultsEst > grader.maxToolResultTokensEst
	) {
		failures.push(
			`total tool-result tokens ${String(trace.tokens.totalResultsEst)} (est) > limit ${String(grader.maxToolResultTokensEst)}`,
		);
	}
	if (
		grader.maxSingleToolResultTokensEst !== undefined &&
		trace.tokens.largestResultEst > grader.maxSingleToolResultTokensEst
	) {
		const tool = trace.tokens.largestResultToolName ?? 'unknown';
		failures.push(
			`largest single tool result ${String(trace.tokens.largestResultEst)} tokens (est) from ${tool} > limit ${String(grader.maxSingleToolResultTokensEst)}`,
		);
	}
	const pass = failures.length === 0;
	return {
		grader,
		pass,
		reason: pass
			? `within budget (${String(trace.toolCalls.length)} calls, ${String(trace.durationMs)}ms, ${String(trace.tokens.totalResultsEst)} result tokens est)`
			: failures.join('; '),
	};
}

export function gradeFinalTextMatches(
	trace: ScenarioTrace,
	grader: TraceFinalTextMatchesGrader,
): GraderResult {
	const text = trace.finalText;
	const anyOf = grader.anyOf.map((p) => new RegExp(p, 'i'));
	const allOf = (grader.allOf ?? []).map((p) => new RegExp(p, 'i'));

	const anyHit = anyOf.length === 0 || anyOf.some((re) => re.test(text));
	const allHit = allOf.every((re) => re.test(text));
	const pass = anyHit && allHit;

	return {
		grader,
		pass,
		reason: pass
			? 'final text satisfies all required patterns'
			: `final text does not match required patterns (got: "${text.slice(0, 120).replace(/\s+/g, ' ')}...")`,
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stable serialization of tool args for loop detection. Order-insensitive on
 * top-level keys so `{a:1,b:2}` and `{b:2,a:1}` count as the same call.
 */
function stableArgs(args: Record<string, unknown>): string {
	const keys = Object.keys(args).sort();
	const ordered: Record<string, unknown> = {};
	for (const k of keys) ordered[k] = args[k];
	return JSON.stringify(ordered);
}
