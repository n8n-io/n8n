interface Placement {
	id: string;
	parentFolderId: string | null;
}

/**
 * Placements as the import leaves them: each id in `plannedParents` moves to the parent it maps to
 * (`null` is the project root). Removal runs after every move, so it must judge this tree.
 */
export function withPlannedParents<T extends Placement>(
	placements: T[],
	plannedParents: ReadonlyMap<string, string | null>,
): T[] {
	if (plannedParents.size === 0) return placements;
	return placements.map((placement) => {
		const parentFolderId = plannedParents.get(placement.id);
		// `null` means "moves to the root", so only `undefined` means "stays".
		return parentFolderId === undefined ? placement : { ...placement, parentFolderId };
	});
}
