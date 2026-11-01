// ---------------------------------------------------------------------------
// Latency metrics for one first-build run, read from captured SSE events
// ---------------------------------------------------------------------------

import { CORE_WORKSPACE_TOOL_NAMES } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { DOMAIN_TOOL_IDS } from '../../src/tools/tool-ids';
import { WORKFLOW_TOOLS, extractOutcomeFromEvents } from '../outcome/event-parser';
import type { CapturedEvent, CapturedToolCall } from '../types';
import { getNestedRecord, getString } from '../utils/safe-extract';

const latencyMetricsSchema = z.object({
	/** Duration of the first tool call that uses the sandbox. A cold sandbox is
	 *  set up inside it, so this isolates the setup the user waits for. */
	firstWorkspaceToolMs: z.number().nullable(),
	/** From message send to the first successful workflow save. */
	timeToFirstWorkflowMs: z.number().nullable(),
	/** From message send to the first `run-finish` or `confirmation-request`. */
	turnMs: z.number().nullable(),
	/** Why a metric is null, so a run is never dropped silently. */
	missing: z.array(z.string()),
});

/** One line of a run file. Parsed back by `--compare`. */
export const latencyRunRecordSchema = z.object({
	label: z.string(),
	gitSha: z.string(),
	promptId: z.string(),
	threadId: z.string(),
	metrics: latencyMetricsSchema,
});

export type LatencyMetrics = z.infer<typeof latencyMetricsSchema>;
export type LatencyRunRecord = z.infer<typeof latencyRunRecordSchema>;
export type LatencyMetricName = Exclude<keyof LatencyMetrics, 'missing'>;

export const LATENCY_METRIC_NAMES: LatencyMetricName[] = [
	'firstWorkspaceToolMs',
	'timeToFirstWorkflowMs',
	'turnMs',
];

const MISSING_REASONS: Record<LatencyMetricName, string> = {
	firstWorkspaceToolMs: 'no workspace tool call',
	timeToFirstWorkflowMs: 'no saved workflow',
	turnMs: 'no run-finish or confirmation-request',
};

/** Tools that set up a cold sandbox on first use. Keep in step with the tools
 *  that call `.requiresWorkspace()`; a test fails when a domain tool is missing. */
const SANDBOX_TOOL_NAMES = new Set<string>([
	...CORE_WORKSPACE_TOOL_NAMES,
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	DOMAIN_TOOL_IDS.GET_WORKFLOW_AS_CODE,
]);

export const STOP_EVENT_TYPES = new Set(['run-finish', 'confirmation-request']);

export function computeLatencyMetrics(events: CapturedEvent[], sentAt: number): LatencyMetrics {
	const { toolCalls } = extractOutcomeFromEvents(events);
	const stopAt = events.find((event) => STOP_EVENT_TYPES.has(event.type))?.timestamp;
	const values: Record<LatencyMetricName, number | null> = {
		firstWorkspaceToolMs: firstStartedSandboxCall(events, toolCalls)?.durationMs ?? null,
		timeToFirstWorkflowMs: elapsedSince(sentAt, firstSaveAt(events, toolCalls)),
		turnMs: elapsedSince(sentAt, stopAt),
	};
	const missing = LATENCY_METRIC_NAMES.filter((name) => values[name] === null);
	return { ...values, missing: missing.map((name) => MISSING_REASONS[name]) };
}

function elapsedSince(sentAt: number, timestamp: number | undefined): number | null {
	return timestamp === undefined ? null : timestamp - sentAt;
}

/** Tool calls finish in any order. Setup runs inside the call that started first. */
function firstStartedSandboxCall(
	events: CapturedEvent[],
	toolCalls: CapturedToolCall[],
): CapturedToolCall | undefined {
	for (const event of events) {
		if (event.type !== 'tool-call') continue;
		const toolCallId = eventToolCallId(event);
		const call = toolCalls.find((candidate) => candidate.toolCallId === toolCallId);
		if (call && SANDBOX_TOOL_NAMES.has(call.toolName)) return call;
	}
	return undefined;
}

/** Mirrors `extractOutcomeFromEvents`: the id sits in the payload or on the event. */
function eventToolCallId(event: CapturedEvent): string | undefined {
	return (
		getString(getNestedRecord(event.data, 'payload') ?? {}, 'toolCallId') ??
		getString(event.data, 'toolCallId')
	);
}

function firstSaveAt(events: CapturedEvent[], toolCalls: CapturedToolCall[]): number | undefined {
	const save = toolCalls.find(
		(call) =>
			WORKFLOW_TOOLS.has(call.toolName) && isRecord(call.result) && call.result.success === true,
	);
	if (!save) return undefined;
	return events.find(
		(event) => event.type === 'tool-result' && eventToolCallId(event) === save.toolCallId,
	)?.timestamp;
}
