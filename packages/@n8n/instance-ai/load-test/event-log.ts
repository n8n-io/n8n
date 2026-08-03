// ---------------------------------------------------------------------------
// Pruned SSE event sink
//
// chat-loop.ts drives a conversation off an array of every SSE event it saw —
// including `text-delta` and the coalesced text/tool blocks. That's right for
// the eval harness (it needs full transcripts) but wrong here: at 50 users the
// driver would balloon and we'd be measuring our own footprint instead of the
// server's.
//
// So we keep exactly what chat-loop reads and project everything else down.
// What it reads, traced from the source:
//   - countEvents(events, 'run-finish' | 'run-start')  -> monotonic counters
//   - events.some(e => e.type === 'agent-spawned')     -> background-task gate
//   - getPendingAgentIds -> extractAgentId, which reads data.agentId OR
//     data.payload.agentId on 'agent-spawned' / 'agent-completed'
//   - events.filter(e => e.type === 'confirmation-request') -> auto-approval,
//     which reads payload.domainAccess, .webSearch, .resourceDecision.options,
//     .credentialRequests, .setupRequests and .inputType — so those events are
//     the one type kept verbatim.
// Nothing reads text-delta, text-block, tool-* or status.
//
// chat-loop.ts itself is imported unmodified; we just hand it a smaller array.
// ---------------------------------------------------------------------------

import { INSTANCE_AI_EPHEMERAL_EVENT_TYPES } from '@n8n/api-types';

import type { N8nClient } from '../evaluations/clients/n8n-client';
import { consumeSseStream, type SseEvent } from '../evaluations/clients/sse-client';
import type { CapturedEvent } from '../evaluations/types';

/** Widened to `string` so arbitrary wire types can be tested against it. */
const EPHEMERAL_TYPES: ReadonlySet<string> = new Set(INSTANCE_AI_EPHEMERAL_EVENT_TYPES);

/** Kept verbatim — auto-approval consumes the whole payload. */
const VERBATIM_TYPES: ReadonlySet<string> = new Set(['confirmation-request']);

/**
 * Never dropped by the overflow cap: chat-loop's counters and matchers depend
 * on them, so losing one would hang or mis-sequence a conversation.
 */
const ESSENTIAL_TYPES: ReadonlySet<string> = new Set([
	'run-start',
	'run-finish',
	'agent-spawned',
	'agent-completed',
	'confirmation-request',
]);

/** Payload fields worth keeping on projected events, for diagnostics. */
const KEPT_PAYLOAD_FIELDS = [
	'agentId',
	'requestId',
	'status',
	'usage',
	'error',
	'message',
	'taskId',
	'runId',
] as const;

const MAX_STRING_LENGTH = 500;
const MAX_CLONE_DEPTH = 3;
const MAX_ARRAY_LENGTH = 20;

export interface EventLogStats {
	/** Every event seen on the wire, including dropped ones. */
	received: number;
	/** Events actually retained in the array. */
	retained: number;
	/** Total `data:` bytes seen — the real server→client volume. */
	approxSseBytes: number;
	countsByType: Record<string, number>;
	droppedEphemeral: number;
	droppedOverflow: number;
	/** True once essentials alone exceeded the cap — a runaway conversation. */
	capExceededByEssentials: boolean;
	parseFailures: number;
}

export interface PrunedEventSink {
	/** The array handed to chat-loop's WaitConfig. */
	readonly events: CapturedEvent[];
	readonly stats: EventLogStats;
	handler: (event: SseEvent) => void;
}

/**
 * Build an SSE handler that keeps the control events chat-loop needs and
 * projects the rest down to a bounded summary.
 *
 * Counters are bumped for *every* event before any drop decision, so the stats
 * remain a faithful record of wire traffic even though the array is not.
 */
export function createPrunedEventSink(cap = 4_000): PrunedEventSink {
	const events: CapturedEvent[] = [];
	const stats: EventLogStats = {
		received: 0,
		retained: 0,
		approxSseBytes: 0,
		countsByType: {},
		droppedEphemeral: 0,
		droppedOverflow: 0,
		capExceededByEssentials: false,
		parseFailures: 0,
	};

	const handler = (sseEvent: SseEvent): void => {
		stats.received++;
		stats.approxSseBytes += sseEvent.data.length;

		const parsed = parseEventData(sseEvent.data);
		if (!parsed) {
			stats.parseFailures++;
			return;
		}

		const type = typeof parsed.type === 'string' ? parsed.type : 'unknown';
		stats.countsByType[type] = (stats.countsByType[type] ?? 0) + 1;

		if (EPHEMERAL_TYPES.has(type)) {
			stats.droppedEphemeral++;
			return;
		}

		const essential = ESSENTIAL_TYPES.has(type);
		if (events.length >= cap) {
			if (!essential) {
				stats.droppedOverflow++;
				return;
			}
			stats.capExceededByEssentials = true;
		}

		events.push(
			VERBATIM_TYPES.has(type)
				? { timestamp: Date.now(), type, data: parsed }
				: projectEvent(type, parsed),
		);
		stats.retained++;
	};

	return { events, stats, handler };
}

/**
 * Open the thread's SSE stream into a pruned sink. Mirrors
 * `startSseConnection` from the eval harness, but with our handler — the eval
 * version hardcodes an unfiltered push.
 */
export async function startPrunedSseConnection(
	client: N8nClient,
	threadId: string,
	sink: PrunedEventSink,
	signal: AbortSignal,
): Promise<void> {
	await consumeSseStream(client.getEventsUrl(threadId), client.cookie, sink.handler, signal);
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

function parseEventData(data: string): Record<string, unknown> | undefined {
	try {
		const parsed: unknown = JSON.parse(data);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Strip an event down to the identity fields plus a small allowlist of payload
 * fields. This is what kills the coalesced `text-block` / `tool-result` blobs
 * that dominate the driver's footprint once deltas are gone.
 */
function projectEvent(type: string, parsed: Record<string, unknown>): CapturedEvent {
	const data: Record<string, unknown> = { type };

	if (typeof parsed.runId === 'string') data.runId = parsed.runId;
	// Kept at the top level too: extractAgentId checks here first.
	if (typeof parsed.agentId === 'string') data.agentId = parsed.agentId;

	const payload = parsed.payload;
	if (isRecord(payload)) {
		const projected: Record<string, unknown> = {};
		for (const field of KEPT_PAYLOAD_FIELDS) {
			if (field in payload) projected[field] = boundedClone(payload[field], MAX_CLONE_DEPTH);
		}
		if (Object.keys(projected).length > 0) data.payload = projected;
	}

	return { timestamp: Date.now(), type, data };
}

/** Depth- and length-bounded copy: keeps shape for diagnostics, not content. */
function boundedClone(value: unknown, depth: number): unknown {
	if (typeof value === 'string') {
		return value.length > MAX_STRING_LENGTH
			? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated ${value.length}]`
			: value;
	}
	if (value === null || typeof value !== 'object') return value;
	if (depth <= 0) return '[depth-limited]';

	if (Array.isArray(value)) {
		const kept = value.slice(0, MAX_ARRAY_LENGTH).map((item) => boundedClone(item, depth - 1));
		if (value.length > MAX_ARRAY_LENGTH) kept.push(`[+${value.length - MAX_ARRAY_LENGTH} more]`);
		return kept;
	}

	if (!isRecord(value)) return '[unsupported]';
	const clone: Record<string, unknown> = {};
	for (const [key, nested] of Object.entries(value)) {
		clone[key] = boundedClone(nested, depth - 1);
	}
	return clone;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
