// ---------------------------------------------------------------------------
// Local token estimation for tool args and results.
//
// Rough char-count / 4 heuristic — accurate enough to catch the failure mode
// the eval cares about (a single tool result blowing up the model's input
// context, e.g. a 30k-token browser_snapshot). Always labelled "Est" in
// downstream consumers so it's never confused with real Anthropic usage.
//
// For an exact whole-flow accounting we'd need instance-ai to forward
// `step-finish` usage events on the SSE stream — see README "Limitations".
// ---------------------------------------------------------------------------

import type { CapturedToolCall } from '../types';
import { safeStringify } from './formatting';

const CHARS_PER_TOKEN = 4;

export function estimateTokens(value: unknown): number {
	if (value === undefined || value === null) return 0;
	const str = typeof value === 'string' ? value : safeStringify(value);
	return Math.ceil(str.length / CHARS_PER_TOKEN);
}

export interface ToolCallTokenEstimate {
	argTokensEst: number;
	resultTokensEst: number;
}

export interface TokenStats {
	/** Parallel to the trace's toolCalls — index i corresponds to toolCalls[i]. */
	perCall: ToolCallTokenEstimate[];
	totalArgsEst: number;
	totalResultsEst: number;
	largestResultEst: number;
	largestResultToolName?: string;
	estimated: true;
}

export function computeTokenStats(toolCalls: CapturedToolCall[]): TokenStats {
	const perCall: ToolCallTokenEstimate[] = toolCalls.map((tc) => ({
		argTokensEst: estimateTokens(tc.args),
		resultTokensEst: estimateTokens(tc.result),
	}));

	let totalArgsEst = 0;
	let totalResultsEst = 0;
	let largestResultEst = 0;
	let largestResultToolName: string | undefined;

	for (let i = 0; i < perCall.length; i++) {
		totalArgsEst += perCall[i].argTokensEst;
		totalResultsEst += perCall[i].resultTokensEst;
		if (perCall[i].resultTokensEst > largestResultEst) {
			largestResultEst = perCall[i].resultTokensEst;
			largestResultToolName = toolCalls[i].toolName;
		}
	}

	return {
		perCall,
		totalArgsEst,
		totalResultsEst,
		largestResultEst,
		largestResultToolName,
		estimated: true,
	};
}
