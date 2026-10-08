/** Spans for the trace view, from the model steps of each turn. */
import type { Turn, Usage } from '../schema';

export interface Span {
	id: string;
	depth: number;
	kind: 'iteration' | 'turn' | 'model' | 'tool';
	label: string;
	tool: string | null;
	start: number;
	/** Null when the source has no end (a tool call in the last step of a run). */
	end: number | null;
	/** True when the duration is derived from the gap between model steps. */
	derived: boolean;
	usage: Usage | null;
	/** The tool call id of a tool span, to find its transcript item. */
	callId: string | null;
}

export interface Trace {
	spans: Span[];
	start: number;
	end: number;
}

export function buildTrace(turns: Turn[]): Trace {
	const turnSpans = turns.flatMap((turn, turnIndex): Span[] => {
		if (turn.steps.length === 0) return [];
		const stepSpans = turn.steps.flatMap((step, stepIndex): Span[] => {
			const modelEnd = step.startMs + step.modelMs;
			const toolSpans = step.toolCalls.map(
				(call): Span => ({
					id: `tool-${call.id}`,
					depth: 3,
					kind: 'tool',
					label: call.tool,
					tool: call.tool,
					start: modelEnd,
					end: step.toolWindowMs === null ? null : modelEnd + step.toolWindowMs,
					derived: true,
					usage: null,
					callId: call.id,
				}),
			);
			const model: Span = {
				id: `step-${turnIndex}-${stepIndex}`,
				depth: 2,
				kind: 'model',
				label: `model step ${stepIndex + 1}${step.finishReason ? ` · ${step.finishReason}` : ''}`,
				tool: null,
				start: step.startMs,
				end: modelEnd,
				derived: false,
				usage: step.usage,
				callId: null,
			};
			return [model, ...toolSpans];
		});
		const start = Math.min(...stepSpans.map((span) => span.start));
		const end = Math.max(...stepSpans.map((span) => span.end ?? span.start));
		const turnSpan: Span = {
			id: `turn-${turnIndex}`,
			depth: 1,
			kind: 'turn',
			label: `turn ${turnIndex + 1}`,
			tool: null,
			start,
			end,
			derived: false,
			usage: null,
			callId: null,
		};
		return [turnSpan, ...stepSpans];
	});
	const turnsOnly = turnSpans.filter((span) => span.kind === 'turn');
	if (turnsOnly.length === 0) return { spans: [], start: 0, end: 0 };
	const start = Math.min(...turnsOnly.map((span) => span.start));
	const end = Math.max(...turnsOnly.map((span) => span.end ?? span.start));
	const iteration: Span = {
		id: 'iteration',
		depth: 0,
		kind: 'iteration',
		label: 'attempt',
		tool: null,
		start,
		end,
		derived: false,
		usage: null,
		callId: null,
	};
	return { spans: [iteration, ...turnSpans], start, end };
}

const TICK_STEPS_S = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];

/** Tick offsets in ms for an axis of `durationMs`, at most about `maxTicks` of them. */
export function ticks(durationMs: number, maxTicks = 8): number[] {
	const stepS =
		TICK_STEPS_S.find((step) => durationMs / 1000 / step <= maxTicks) ??
		TICK_STEPS_S[TICK_STEPS_S.length - 1];
	const count = Math.floor(durationMs / 1000 / stepS);
	return Array.from({ length: count + 1 }, (_, i) => i * stepS * 1000);
}

/** Position of a time on an axis, in percent. */
export const percentOf = (time: number, trace: Pick<Trace, 'start' | 'end'>) =>
	trace.end > trace.start ? ((time - trace.start) / (trace.end - trace.start)) * 100 : 0;
