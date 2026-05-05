import type { ObservationalMemoryContext } from './message-list';
import { OBSERVATION_SCHEMA_VERSION } from '../types/sdk/observation';
import type {
	BuiltObservationStore,
	FormatContextFn,
	Observation,
	ObservationalMemoryConfig,
	ScopeKind,
} from '../types/sdk/observation';

/**
 * Load and render the observational-memory section for a scope.
 *
 * Queries the latest row of `kind === config.summaryKind` plus any
 * uncompacted rows after it (filtered to schema versions the SDK can
 * interpret), computes staleness against `stalenessThresholdMs` if set,
 * and either calls the consumer's `formatContext` or falls back to the
 * SDK's minimal default formatter.
 *
 * Returns `null` when the scope has neither a rolling summary nor any
 * recent uncompacted observations — the caller injects nothing in that
 * case.
 */
export async function loadObservationalMemoryContext(
	store: BuiltObservationStore,
	config: ObservationalMemoryConfig,
	scopeKind: ScopeKind,
	scopeId: string,
	now: Date = new Date(),
): Promise<ObservationalMemoryContext | null> {
	const summaryKind = config.summaryKind ?? 'summary';

	const summaryRows = await store.getObservations({
		scopeKind,
		scopeId,
		kindIs: summaryKind,
		schemaVersionAtMost: OBSERVATION_SCHEMA_VERSION,
		limit: 1,
	});
	const latestSummary = summaryRows.length > 0 ? summaryRows[summaryRows.length - 1] : null;

	const recentObservations = await store.getObservations({
		scopeKind,
		scopeId,
		sinceSeq: latestSummary?.seq,
		schemaVersionAtMost: OBSERVATION_SCHEMA_VERSION,
		onlyUncompacted: true,
	});

	if (!latestSummary && recentObservations.length === 0) return null;

	const summaryText = latestSummary ? renderPayload(latestSummary.payload) : null;
	const summaryUpdatedAt = latestSummary?.createdAt ?? null;
	const isStale =
		config.stalenessThresholdMs !== undefined &&
		summaryUpdatedAt !== null &&
		now.getTime() - summaryUpdatedAt.getTime() > config.stalenessThresholdMs;

	const formatter: FormatContextFn = config.formatContext ?? defaultFormatContext;
	const renderedSection = formatter({
		summary: summaryText,
		summaryUpdatedAt,
		isStale,
		recentObservations,
	});

	return { renderedSection: renderedSection.length > 0 ? renderedSection : null };
}

/**
 * SDK default formatter. Plain text, no section labels — consumers that
 * want labelled, styled output should pass their own `formatContext`.
 *
 * Layout:
 *   [stale]   (only when isStale)
 *   <summary text>
 *   - <observation payload>
 *   - <observation payload>
 */
function defaultFormatContext(ctx: {
	summary: string | null;
	summaryUpdatedAt: Date | null;
	isStale: boolean;
	recentObservations: Observation[];
}): string {
	const lines: string[] = [];
	if (ctx.isStale) lines.push('[stale]');
	if (ctx.summary !== null) lines.push(ctx.summary);
	for (const row of ctx.recentObservations) {
		lines.push(`- ${renderPayload(row.payload)}`);
	}
	return lines.join('\n');
}

function renderPayload(payload: unknown): string {
	if (typeof payload === 'string') return payload;
	if (payload === null || payload === undefined) return '';
	try {
		return JSON.stringify(payload);
	} catch {
		// Defensive — JSON.stringify only fails on circular references, which
		// JSONValue shouldn't carry. Skip the row rather than emit garbage.
		return '';
	}
}
