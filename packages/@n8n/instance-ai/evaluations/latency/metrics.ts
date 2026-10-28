// ---------------------------------------------------------------------------
// Latency metrics for one first-build run, read from captured SSE events
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { WORKFLOW_TOOLS, extractOutcomeFromEvents } from '../outcome/event-parser';
import type { CapturedEvent, CapturedToolCall } from '../types';
import { getNestedRecord, getString } from '../utils/safe-extract';

const latencyMetricsSchema = z.object({
	/** Duration of the first `workspace_*` tool call. A cold sandbox is set up
	 *  inside it, so this isolates the setup the user waits for. */
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

const STOP_EVENT_TYPES = new Set(['run-finish', 'confirmation-request']);

export function computeLatencyMetrics(events: CapturedEvent[], sentAt: number): LatencyMetrics {
	const { toolCalls } = extractOutcomeFromEvents(events);
	const stopAt = events.find((event) => STOP_EVENT_TYPES.has(event.type))?.timestamp;
	const values: Record<LatencyMetricName, number | null> = {
		firstWorkspaceToolMs:
			toolCalls.find((call) => call.toolName.startsWith('workspace_'))?.durationMs ?? null,
		timeToFirstWorkflowMs: elapsedSince(sentAt, firstSaveAt(events, toolCalls)),
		turnMs: elapsedSince(sentAt, stopAt),
	};
	const missing = LATENCY_METRIC_NAMES.filter((name) => values[name] === null);
	return { ...values, missing: missing.map((name) => MISSING_REASONS[name]) };
}

function elapsedSince(sentAt: number, timestamp: number | undefined): number | null {
	return timestamp === undefined ? null : timestamp - sentAt;
}

function firstSaveAt(events: CapturedEvent[], toolCalls: CapturedToolCall[]): number | undefined {
	const save = toolCalls.find(
		(call) =>
			WORKFLOW_TOOLS.has(call.toolName) && isRecord(call.result) && call.result.success === true,
	);
	if (!save) return undefined;
	return events.find(
		(event) =>
			event.type === 'tool-result' &&
			getString(getNestedRecord(event.data, 'payload') ?? {}, 'toolCallId') === save.toolCallId,
	)?.timestamp;
}
