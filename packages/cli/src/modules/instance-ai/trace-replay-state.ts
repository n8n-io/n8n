import type {
	InstanceAiTraceContext,
	TraceIndex as TraceIndexType,
	IdRemapper as IdRemapperType,
	TraceWriter as TraceWriterType,
	TraceEvent,
} from '@n8n/instance-ai';

const TOOL_TRACE_EVENT_KINDS = new Set(['tool-call', 'tool-suspend', 'tool-resume']);

function getTraceEventKind(event: unknown): string | undefined {
	if (typeof event !== 'object' || event === null || Array.isArray(event)) return undefined;

	const kind = Reflect.get(event, 'kind');
	return typeof kind === 'string' ? kind : undefined;
}

function isHeaderTraceEvent(event: unknown): boolean {
	return getTraceEventKind(event) === 'header';
}

function isToolTraceEvent(event: unknown): boolean {
	const kind = getTraceEventKind(event);
	return kind !== undefined && TOOL_TRACE_EVENT_KINDS.has(kind);
}

function hasToolTraceEvents(events: unknown[] | undefined): boolean {
	return events?.some(isToolTraceEvent) ?? false;
}

function mergeTraceEvents(...eventLists: unknown[][]): unknown[] {
	const merged: unknown[] = [];
	let hasHeader = false;
	const seenToolEvents = new Set<string>();

	for (const events of eventLists) {
		for (const event of events) {
			if (isHeaderTraceEvent(event)) {
				if (hasHeader) continue;
				hasHeader = true;
			}
			if (isToolTraceEvent(event)) {
				const key = JSON.stringify(event);
				if (seenToolEvents.has(key)) continue;
				seenToolEvents.add(key);
			}
			merged.push(event);
		}
	}

	return merged;
}

/**
 * Manages test-only trace replay state for Instance AI e2e tests.
 * Encapsulates trace event storage, the active slug, and shared
 * TraceIndex/IdRemapper instances that are reused across runs
 * within the same test.
 *
 * Only active when E2E_TESTS env var is set.
 */
export class TraceReplayState {
	/** In-memory store for tool trace events keyed by test slug. */
	private eventsBySlug = new Map<string, unknown[]>();

	/** Slug of the active trace recording. */
	private activeSlug: string | undefined;

	/** Shared TraceIndex per slug — reused across all runs within one test. */
	private sharedTraceIndex?: TraceIndexType;

	private sharedIdRemapper?: IdRemapperType;

	private sharedTraceSlug?: string;

	private sharedTraceWriter?: TraceWriterType;

	private sharedTraceWriterSlug?: string;

	getActiveSlug(): string | undefined {
		return this.activeSlug;
	}

	loadEvents(slug: string, events: unknown[]): void {
		this.eventsBySlug.set(slug, events);
		this.activeSlug = slug;
	}

	getEvents(slug: string): unknown[] {
		return this.eventsBySlug.get(slug) ?? [];
	}

	activateSlug(slug: string): void {
		this.activeSlug = slug;
	}

	clearEvents(slug: string): void {
		this.eventsBySlug.delete(slug);
		if (this.activeSlug === slug) {
			this.activeSlug = undefined;
		}
		if (this.sharedTraceSlug === slug) {
			this.sharedTraceIndex = undefined;
			this.sharedIdRemapper = undefined;
			this.sharedTraceSlug = undefined;
		}
		if (this.sharedTraceWriterSlug === slug) {
			this.sharedTraceWriter = undefined;
			this.sharedTraceWriterSlug = undefined;
		}
	}

	/**
	 * Preserve recorded trace events from a writer into the slug-scoped store
	 * so the test fixture teardown can still retrieve them via GET.
	 */
	preserveWriterEvents(slug: string, writerEvents: unknown[]): void {
		const existing = this.eventsBySlug.get(slug) ?? [];
		existing.push(...writerEvents);
		this.eventsBySlug.set(slug, existing);
	}

	/**
	 * Collect events from active trace writers for a given slug.
	 * Returns the events if found, or falls back to preserved events.
	 */
	getEventsWithWriterFallback(
		slug: string,
		activeWriterEntries: Iterable<{ traceSlug?: string; tracing: InstanceAiTraceContext }>,
	): unknown[] {
		const fromWriters: unknown[] = [];
		for (const entry of activeWriterEntries) {
			if (
				(entry.traceSlug === slug || entry.traceSlug === undefined) &&
				entry.tracing.traceWriter
			) {
				fromWriters.push(...entry.tracing.traceWriter.getEvents());
			}
		}

		const preserved = this.eventsBySlug.get(slug) ?? [];
		const merged = mergeTraceEvents(preserved, fromWriters);
		if (hasToolTraceEvents(merged)) return merged;

		return fromWriters.length > 0 ? merged : preserved;
	}

	/**
	 * Configure trace replay mode on a tracing context.
	 * In replay mode, reuses shared TraceIndex/IdRemapper across all runs.
	 * In record mode, creates a new TraceWriter.
	 */
	async configureReplayMode(tracing: InstanceAiTraceContext): Promise<void> {
		if (process.env.E2E_TESTS !== 'true') {
			return;
		}

		const { TraceIndex: TI, IdRemapper: IR, TraceWriter: TW } = await import('@n8n/instance-ai');

		const slug = this.activeSlug;
		const events = slug ? this.eventsBySlug.get(slug) : undefined;

		if (hasToolTraceEvents(events)) {
			if (this.sharedTraceSlug !== slug || !this.sharedTraceIndex) {
				this.sharedTraceIndex = new TI(events as TraceEvent[]);
				this.sharedIdRemapper = new IR();
				this.sharedTraceSlug = slug;
			}
			tracing.replayMode = 'replay';
			tracing.traceIndex = this.sharedTraceIndex;
			tracing.idRemapper = this.sharedIdRemapper!;
		} else {
			if (this.sharedTraceWriterSlug !== slug || !this.sharedTraceWriter) {
				this.sharedTraceWriter = new TW('recording');
				this.sharedTraceWriterSlug = slug;
			}
			tracing.replayMode = 'record';
			tracing.traceWriter = this.sharedTraceWriter;
		}
	}
}
