/** A stored source identity excludes the local-ID fallback. Ambiguity excludes both. */
export function matchSourceIds<T extends { id: string }>(
	sourceIds: string[],
	candidates: T[],
	getSourceId: (candidate: T) => string | null,
) {
	const requested = new Set(sourceIds);
	const bySourceId = new Map<string, T[]>();
	for (const candidate of candidates) {
		const sourceId = getSourceId(candidate);
		if (sourceId === null || !requested.has(sourceId)) continue;
		const group = bySourceId.get(sourceId) ?? [];
		group.push(candidate);
		bySourceId.set(sourceId, group);
	}
	const matches = new Map<string, T>();
	const ambiguous = new Map<string, T[]>();
	for (const [sourceId, group] of bySourceId) {
		if (group.length === 1) matches.set(sourceId, group[0]);
		else
			ambiguous.set(
				sourceId,
				group.toSorted((left, right) => left.id.localeCompare(right.id)),
			);
	}
	for (const candidate of candidates) {
		if (
			getSourceId(candidate) !== null ||
			!requested.has(candidate.id) ||
			bySourceId.has(candidate.id)
		)
			continue;
		matches.set(candidate.id, candidate);
	}
	return { matches, ambiguous };
}
