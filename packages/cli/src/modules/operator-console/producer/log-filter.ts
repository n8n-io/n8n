import type { OperatorLogFilter, OperatorLogLevel, OperatorLogRecord } from '@n8n/api-types';

/**
 * Severity ordering. Lower rank is more severe, so a record passes `minLevel`
 * when its rank is at or below the threshold's rank.
 */
const LEVEL_RANK: Record<OperatorLogLevel, number> = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
};

export type LogFilterPredicate = (record: OperatorLogRecord) => boolean;

/**
 * Pre-compile a filter into a predicate.
 *
 * This runs on every captured line on every host, so everything that can be
 * hoisted out of the per-record path — lowercasing `grep`, turning the
 * multi-selects into sets — is hoisted here instead of being redone per line.
 *
 * Absent and empty list constraints both mean "unconstrained": a multi-select
 * with nothing picked is the same request as one that was never touched.
 */
export function compileFilter(filter: OperatorLogFilter): LogFilterPredicate {
	const maxRank = filter.minLevel === undefined ? undefined : LEVEL_RANK[filter.minLevel];
	const scopes = toSet(filter.scopes);
	const hostIds = toSet(filter.hostIds);
	const roles = toSet(filter.roles);
	const { executionId } = filter;
	const grep = filter.grep ? filter.grep.toLowerCase() : undefined;

	return (record) => {
		if (maxRank !== undefined && LEVEL_RANK[record.level] > maxRank) return false;
		if (scopes && (record.scope === undefined || !scopes.has(record.scope))) return false;
		if (hostIds && !hostIds.has(record.hostId)) return false;
		if (roles && !roles.has(record.role)) return false;
		if (executionId !== undefined && record.executionId !== executionId) return false;

		// Substring over `message` only. Stringifying `meta` per line is exactly the
		// per-host cost this design exists to avoid; labels are the query surface.
		if (grep !== undefined && !record.message.toLowerCase().includes(grep)) return false;

		return true;
	};
}

/**
 * Whether a record passes a filter. Convenience wrapper for one-off checks —
 * hot paths should hold on to a {@link compileFilter} predicate instead.
 */
export function matches(record: OperatorLogRecord, filter: OperatorLogFilter): boolean {
	return compileFilter(filter)(record);
}

/**
 * Broaden `a` and `b` into a filter that admits every record either of them
 * would admit.
 *
 * Producers hold a single lease, so two consoles with different filters must be
 * served by one command. Erring wide costs bandwidth; erring narrow silently
 * starves a console, which is the worse failure.
 */
export function unionFilters(a: OperatorLogFilter, b: OperatorLogFilter): OperatorLogFilter {
	const union: OperatorLogFilter = {};

	// An absent constraint on either side already admits everything, so the union
	// drops the constraint entirely.
	if (a.minLevel !== undefined && b.minLevel !== undefined) {
		union.minLevel = LEVEL_RANK[a.minLevel] >= LEVEL_RANK[b.minLevel] ? a.minLevel : b.minLevel;
	}

	const scopes = unionLists(a.scopes, b.scopes);
	if (scopes) union.scopes = scopes;

	const hostIds = unionLists(a.hostIds, b.hostIds);
	if (hostIds) union.hostIds = hostIds;

	const roles = unionLists(a.roles, b.roles);
	if (roles) union.roles = roles;

	// Scalars cannot be widened without dropping them, so they survive only when
	// both sides agree.
	if (a.executionId !== undefined && a.executionId === b.executionId) {
		union.executionId = a.executionId;
	}

	if (
		a.grep !== undefined &&
		b.grep !== undefined &&
		a.grep.toLowerCase() === b.grep.toLowerCase()
	) {
		union.grep = a.grep;
	}

	return union;
}

function toSet<T>(values: T[] | undefined): Set<T> | undefined {
	return values === undefined || values.length === 0 ? undefined : new Set(values);
}

function unionLists<T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined {
	const aConstrains = a !== undefined && a.length > 0;
	const bConstrains = b !== undefined && b.length > 0;

	if (!aConstrains || !bConstrains) return undefined;

	return [...new Set([...a, ...b])];
}
