import type {
	OperatorLogBatch,
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogOrigin,
	OperatorLogReadResult,
	OperatorLogRecord,
	OperatorLogRole,
} from '@n8n/api-types';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import {
	fetchOperatorLogHosts,
	fetchOperatorLogMeta,
	fetchOperatorLogs,
	startOperatorLogTail,
	stopOperatorLogTail,
} from './operatorConsole.api';
import {
	OPERATOR_CONSOLE_HISTORY_LIMIT,
	OPERATOR_CONSOLE_LEASE_TTL_FALLBACK_MS,
	OPERATOR_CONSOLE_MAX_ENTRIES,
	OPERATOR_CONSOLE_PAUSE_BUFFER_MAX,
	OPERATOR_CONSOLE_STORE,
} from './operatorConsole.constants';
import type {
	OperatorConsoleConnectionState,
	OperatorConsoleEntry,
	OperatorConsoleMarkerEntry,
	OperatorConsoleMarkerKind,
} from './operatorConsole.types';

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export const useOperatorConsoleStore = defineStore(OPERATOR_CONSOLE_STORE, () => {
	const rootStore = useRootStore();

	/**
	 * Log rows and inline markers, oldest first. `shallowRef` on purpose: the pane
	 * holds up to `OPERATOR_CONSOLE_MAX_ENTRIES` immutable records, and deep
	 * reactivity would proxy every one of them. Always replace, never mutate.
	 */
	const entries = shallowRef<OperatorConsoleEntry[]>([]);

	const filter = ref<OperatorLogFilter>({});
	const hosts = ref<OperatorLogHost[]>([]);
	const connectionState = ref<OperatorConsoleConnectionState>('idle');
	const lastError = ref<string | null>(null);
	const isLoading = ref(false);
	const isPaused = ref(false);
	const followTail = ref(true);

	/** Lines discarded by the producer-side rate cap, for the whole session. */
	const droppedTotal = ref(0);
	/** Lines evicted from the client buffer because it hit its cap. */
	const trimmedTotal = ref(0);
	/** The server reported that lines older than our scrollback were already gone. */
	const hasServerGap = ref(false);

	/** Batches held back while paused, replayed in order on resume. */
	const pausedBatches = ref<OperatorLogBatch[]>([]);
	const droppedWhilePaused = ref(0);

	/** Hosts and scopes seen in the stream, used to widen the filter pickers. */
	const observedHosts = ref<Record<string, OperatorLogRole>>({});
	const observedScopes = ref<string[]>([]);
	/** The full scope list from the server, so the picker is useful before any line arrives. */
	const knownScopes = ref<string[]>([]);
	/** Server lease TTL; the renewal interval is derived from it, never hardcoded. */
	const leaseTtlMs = ref(OPERATOR_CONSOLE_LEASE_TTL_FALLBACK_MS);

	let cursor: string | undefined;
	let lastOrigin: OperatorLogOrigin | undefined;
	let entryCounter = 0;
	let leaseTimer: ReturnType<typeof setInterval> | null = null;

	const isActive = computed(() => connectionState.value !== 'idle');

	const pausedLineCount = computed(() =>
		pausedBatches.value.reduce((total, batch) => total + batch.records.length, 0),
	);

	const recordCount = computed(
		() => entries.value.filter((entry) => entry.kind === 'record').length,
	);

	/** Union of the hosts the server knows about and the hosts seen in the stream. */
	const hostOptions = computed<OperatorLogHost[]>(() => {
		const byId = new Map<string, OperatorLogHost>();
		for (const host of hosts.value) byId.set(host.hostId, host);
		for (const [hostId, role] of Object.entries(observedHosts.value)) {
			if (!byId.has(hostId)) byId.set(hostId, { hostId, role, lastSeenAt: '' });
		}
		return [...byId.values()].sort((a, b) => a.hostId.localeCompare(b.hostId));
	});

	const scopeOptions = computed(() => {
		const selected = filter.value.scopes ?? [];
		// Observed scopes are still merged in: a scope the server does not know
		// about (a community node, a renamed scope) should stay selectable rather
		// than vanish from the picker.
		return [...new Set([...knownScopes.value, ...observedScopes.value, ...selected])].sort();
	});

	function nextId(prefix: string): string {
		entryCounter += 1;
		return `${prefix}-${entryCounter}`;
	}

	function marker(
		kind: OperatorConsoleMarkerKind,
		extra: Pick<OperatorConsoleMarkerEntry, 'count' | 'hostId'> = {},
	): OperatorConsoleMarkerEntry {
		return { kind: 'marker', id: nextId(kind), marker: kind, ...extra };
	}

	/**
	 * Appends one record, emitting a boundary marker when the stream crosses
	 * between file-sourced history and the live tail. History carries only what
	 * the winston file transport wrote, so the two are not interchangeable and
	 * the seam has to be visible.
	 */
	function pushRecord(target: OperatorConsoleEntry[], record: OperatorLogRecord): void {
		if (record.origin === 'file' && lastOrigin !== 'file') {
			target.push(marker('historyStart'));
		} else if (record.origin !== 'file' && lastOrigin === 'file') {
			target.push(marker('historyEnd'));
		}
		lastOrigin = record.origin;

		if (!observedHosts.value[record.hostId]) {
			observedHosts.value = { ...observedHosts.value, [record.hostId]: record.role };
		}
		if (record.scope && !observedScopes.value.includes(record.scope)) {
			observedScopes.value = [...observedScopes.value, record.scope];
		}

		target.push({ kind: 'record', id: nextId('record'), record });
	}

	/** Evicts the oldest entries once the buffer is full, leaving a marker behind. */
	function withCap(list: OperatorConsoleEntry[]): OperatorConsoleEntry[] {
		if (list.length <= OPERATOR_CONSOLE_MAX_ENTRIES) return list;

		// Slice one extra so the replacement marker keeps the buffer at exactly the cap.
		const removeCount = list.length - OPERATOR_CONSOLE_MAX_ENTRIES + 1;
		const removed = list.slice(0, removeCount);
		trimmedTotal.value += removed.filter((entry) => entry.kind === 'record').length;

		return [marker('trimmed', { count: trimmedTotal.value }), ...list.slice(removeCount)];
	}

	function appendEntries(newEntries: OperatorConsoleEntry[]): void {
		if (newEntries.length === 0) return;
		entries.value = withCap(entries.value.concat(newEntries));
	}

	function ingestReadResult(result: OperatorLogReadResult): void {
		const built: OperatorConsoleEntry[] = [];

		if (result.gap) {
			hasServerGap.value = true;
			built.push(marker('gap'));
		}
		for (const record of result.records) pushRecord(built, record);

		cursor = result.nextCursor;
		appendEntries(built);
	}

	function ingestBatchNow(batch: OperatorLogBatch): void {
		const built: OperatorConsoleEntry[] = [];

		if (batch.dropped > 0) {
			droppedTotal.value += batch.dropped;
			built.push(marker('dropped', { count: batch.dropped, hostId: batch.hostId }));
		}
		for (const record of batch.records) pushRecord(built, record);

		appendEntries(built);
	}

	/**
	 * Entry point for the push handler. Ignored unless a console is open, so a
	 * late batch arriving after the lease was dropped cannot resurrect the pane.
	 */
	function ingestBatch(batch: OperatorLogBatch): void {
		if (!isActive.value) return;

		if (isPaused.value) {
			bufferWhilePaused(batch);
			return;
		}
		ingestBatchNow(batch);
	}

	function bufferWhilePaused(batch: OperatorLogBatch): void {
		const buffered = [...pausedBatches.value, batch];
		let total = buffered.reduce((sum, item) => sum + item.records.length, 0);

		while (total > OPERATOR_CONSOLE_PAUSE_BUFFER_MAX && buffered.length > 0) {
			const evicted = buffered.shift();
			if (!evicted) break;
			total -= evicted.records.length;
			// The batch's own producer-side drops go with it, or they'd vanish silently.
			droppedWhilePaused.value += evicted.records.length + evicted.dropped;
		}

		pausedBatches.value = buffered;
	}

	function pause(): void {
		isPaused.value = true;
	}

	function resume(): void {
		if (!isPaused.value) return;
		isPaused.value = false;

		if (droppedWhilePaused.value > 0) {
			droppedTotal.value += droppedWhilePaused.value;
			appendEntries([marker('dropped', { count: droppedWhilePaused.value })]);
			droppedWhilePaused.value = 0;
		}

		const buffered = pausedBatches.value;
		pausedBatches.value = [];
		for (const batch of buffered) ingestBatchNow(batch);
	}

	function togglePause(): void {
		if (isPaused.value) resume();
		else pause();
	}

	function setFollowTail(value: boolean): void {
		followTail.value = value;
	}

	function clearBuffer(): void {
		entries.value = [];
		pausedBatches.value = [];
		droppedWhilePaused.value = 0;
		droppedTotal.value = 0;
		trimmedTotal.value = 0;
		hasServerGap.value = false;
		lastOrigin = undefined;
		cursor = undefined;
	}

	async function fetchHosts(): Promise<void> {
		hosts.value = await fetchOperatorLogHosts(rootStore.restApiContext);
	}

	/**
	 * Best-effort: a console that cannot read its metadata is still usable with a
	 * stream-seeded scope picker and the fallback renewal interval, so a failure
	 * here must not stop the tail from starting.
	 */
	async function fetchMeta(): Promise<void> {
		try {
			const meta = await fetchOperatorLogMeta(rootStore.restApiContext);
			knownScopes.value = meta.scopes;
			if (meta.leaseTtlMs > 0) leaseTtlMs.value = meta.leaseTtlMs;
		} catch {
			// Keep the defaults.
		}
	}

	async function loadHistory(): Promise<void> {
		isLoading.value = true;
		try {
			const result = await fetchOperatorLogs(rootStore.restApiContext, {
				filter: filter.value,
				limit: OPERATOR_CONSOLE_HISTORY_LIMIT,
				since: cursor,
			});
			ingestReadResult(result);
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * (Re-)issues the tail lease. Filtering is evaluated at the producers, so a
	 * filter change means a new lease — never a client-side re-filter of what we
	 * already have.
	 */
	async function issueLease(): Promise<void> {
		const response = await startOperatorLogTail(rootStore.restApiContext, filter.value);

		// Tolerate a missing or malformed body — an older server or a proxy that
		// strips it must not take the tail down; the fallback TTL still works.
		const ttl = response?.leaseTtlMs;
		if (typeof ttl === 'number' && ttl > 0) leaseTtlMs.value = ttl;
	}

	function startLeaseRenewal(): void {
		stopLeaseRenewal();
		// Half the server's TTL, so a single failed renewal cannot lapse the lease.
		// Derived rather than hardcoded: raising the TTL server-side used to
		// silently shrink the client's safety margin.
		leaseTimer = setInterval(
			() => {
				void issueLease().catch((error: unknown) => {
					lastError.value = errorMessage(error);
				});
			},
			Math.max(1000, Math.floor(leaseTtlMs.value / 2)),
		);
	}

	function stopLeaseRenewal(): void {
		if (leaseTimer) {
			clearInterval(leaseTimer);
			leaseTimer = null;
		}
	}

	async function start(initialFilter: OperatorLogFilter = {}): Promise<void> {
		filter.value = { ...initialFilter };
		connectionState.value = 'connecting';
		lastError.value = null;
		clearBuffer();

		try {
			await Promise.all([fetchHosts(), fetchMeta()]);
			await loadHistory();
			await issueLease();
			startLeaseRenewal();
			connectionState.value = 'streaming';
		} catch (error) {
			connectionState.value = 'error';
			lastError.value = errorMessage(error);
		}
	}

	async function stop(): Promise<void> {
		stopLeaseRenewal();
		const wasActive = isActive.value;
		connectionState.value = 'idle';
		isPaused.value = false;

		if (!wasActive) return;
		try {
			await stopOperatorLogTail(rootStore.restApiContext);
		} catch {
			// The lease expires on its own; a failed teardown is not worth surfacing.
		}
	}

	/** Merges a partial filter, then reloads scrollback and re-issues the lease. */
	async function updateFilter(patch: Partial<OperatorLogFilter>): Promise<void> {
		filter.value = { ...filter.value, ...patch };
		if (!isActive.value) return;

		clearBuffer();
		lastError.value = null;

		try {
			await loadHistory();
			await issueLease();
			connectionState.value = 'streaming';
		} catch (error) {
			connectionState.value = 'error';
			lastError.value = errorMessage(error);
		}
	}

	return {
		// state
		entries,
		filter,
		hosts,
		connectionState,
		lastError,
		isLoading,
		isPaused,
		followTail,
		droppedTotal,
		trimmedTotal,
		hasServerGap,
		droppedWhilePaused,
		observedScopes,

		// getters
		isActive,
		pausedLineCount,
		recordCount,
		hostOptions,
		scopeOptions,
		leaseTtlMs,

		// actions
		ingestBatch,
		pause,
		resume,
		togglePause,
		setFollowTail,
		clearBuffer,
		fetchHosts,
		loadHistory,
		start,
		stop,
		updateFilter,
	};
});
