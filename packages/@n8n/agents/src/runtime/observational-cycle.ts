import type { AgentEventBus } from './event-bus';
import { advanceCursor, getDeltaSinceCursor } from './observation-cursor';
import { withObservationLock } from './observation-lock';
import { AgentEvent } from '../types/runtime/event';
import type { BuiltMemory } from '../types/sdk/memory';
import type {
	BuiltObservationStore,
	CompactFn,
	NewObservation,
	ObserveFn,
	ScopeKind,
} from '../types/sdk/observation';
import type { BuiltTelemetry } from '../types/telemetry';

const DEFAULT_SUMMARY_KIND = 'summary';
const DEFAULT_LOCK_TTL_MS = 30_000;

export interface RunObservationalCycleOpts {
	memory: BuiltMemory & BuiltObservationStore;
	scopeKind: ScopeKind;
	scopeId: string;
	observe: ObserveFn;
	compact?: CompactFn;
	compactionRowThreshold?: number;
	summaryKind?: string;
	lockTtlMs?: number;
	telemetry?: BuiltTelemetry;
	eventBus?: AgentEventBus;
}

export type RunObservationalCycleResult =
	| { status: 'skipped'; reason: 'lock-held' | 'no-delta' }
	| { status: 'ran'; observationsWritten: number; compacted: boolean };

/**
 * Run one observation cycle for a scope: acquire the lock, read the delta
 * since the cursor, invoke the consumer's `observe`, write its rows,
 * advance the cursor, and (when configured) trigger the compactor once
 * the uncompacted-row count crosses the threshold.
 *
 * Returns `'skipped'` when the lock is held by another holder or the
 * delta is empty (nothing to do). Errors from the consumer-supplied
 * `observe` and `compact` are caught and tagged via `AgentEvent.Error`;
 * the cycle does not throw, mirroring the silent-log pattern of
 * `generateThreadTitle`.
 *
 * The optional `telemetry` is forwarded to both `observe(ctx)` and
 * `compact(ctx)` so consumer LLM calls (e.g. via `generateText`) can wire
 * their `experimental_telemetry` to the same OTel tracer the main agent
 * uses. The orchestrator itself does not currently emit spans — that's a
 * future addition once we have a span shape we want to commit to.
 */
export async function runObservationalCycle(
	opts: RunObservationalCycleOpts,
): Promise<RunObservationalCycleResult> {
	const summaryKind = opts.summaryKind ?? DEFAULT_SUMMARY_KIND;
	const ttlMs = opts.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;

	const lockResult = await withObservationLock(
		opts.memory,
		opts.scopeKind,
		opts.scopeId,
		{ ttlMs },
		async () => await runInsideLock(opts, summaryKind),
	);

	if (lockResult.status === 'skipped') return { status: 'skipped', reason: 'lock-held' };
	return lockResult.value;
}

async function runInsideLock(
	opts: RunObservationalCycleOpts,
	summaryKind: string,
): Promise<RunObservationalCycleResult> {
	const { memory, scopeKind, scopeId, observe, compact, eventBus, telemetry } = opts;

	const { messages: deltaMessages, cursor } = await getDeltaSinceCursor(memory, scopeKind, scopeId);
	if (deltaMessages.length === 0) return { status: 'skipped', reason: 'no-delta' };

	const summaryRows = await memory.getObservations({
		scopeKind,
		scopeId,
		kindIs: summaryKind,
		limit: 1,
	});
	const previousSummary = summaryRows.length > 0 ? renderPayload(summaryRows[0].payload) : null;

	let observerRows: NewObservation[];
	try {
		observerRows = await observe({
			deltaMessages,
			currentSummary: previousSummary,
			cursor,
			telemetry,
		});
	} catch (error) {
		emitError(eventBus, 'observer', error);
		return { status: 'skipped', reason: 'no-delta' };
	}

	if (observerRows.length > 0) {
		await memory.appendObservations(observerRows);
	}

	const lastMessage = deltaMessages[deltaMessages.length - 1];
	await advanceCursor(memory, scopeKind, scopeId, lastMessage);

	let compacted = false;
	if (compact && opts.compactionRowThreshold !== undefined) {
		try {
			compacted = await maybeCompact(opts, summaryKind, previousSummary);
		} catch (error) {
			emitError(eventBus, 'compactor', error);
		}
	}

	return { status: 'ran', observationsWritten: observerRows.length, compacted };
}

async function maybeCompact(
	opts: RunObservationalCycleOpts,
	summaryKind: string,
	previousSummary: string | null,
): Promise<boolean> {
	const { memory, scopeKind, scopeId, compact, telemetry } = opts;
	if (!compact || opts.compactionRowThreshold === undefined) return false;

	const uncompacted = await memory.getObservations({
		scopeKind,
		scopeId,
		onlyUncompacted: true,
	});
	// Don't feed prior summary rows back into the compactor's input — those
	// are output of an earlier cycle, not raw observations.
	const inputs = uncompacted.filter((row) => row.kind !== summaryKind);
	if (inputs.length < opts.compactionRowThreshold) return false;

	const result = await compact({
		uncompactedRows: inputs,
		previousSummary,
		telemetry,
	});
	await memory.appendObservations([result.summary]);
	await memory.markObservationsCompacted(
		inputs.map((r) => r.id),
		new Date(),
	);
	return true;
}

function emitError(
	eventBus: AgentEventBus | undefined,
	source: 'observer' | 'compactor',
	error: unknown,
): void {
	if (!eventBus) return;
	const message = error instanceof Error ? error.message : String(error);
	eventBus.emit({ type: AgentEvent.Error, message, error, source });
}

function renderPayload(payload: unknown): string {
	if (typeof payload === 'string') return payload;
	if (payload === null || payload === undefined) return '';
	try {
		return JSON.stringify(payload);
	} catch {
		return '';
	}
}
