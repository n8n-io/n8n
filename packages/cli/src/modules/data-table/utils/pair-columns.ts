type Pairable = { id?: string; name: string };

type ColumnPair = {
	source: { name: string; type: string };
	target: { name: string; type: string };
};

/**
 * Pairs each source column with a target column: first by id, then by exact
 * name. `pairs` and `removed` keep the target order, `added` keeps the source order.
 */
export function pairDataTableColumns<S extends Pairable, T extends Pairable>(
	source: S[],
	target: T[],
): { pairs: Array<{ source: S; target: T }>; added: S[]; removed: T[] } {
	const unpaired = new Set(source);
	const take = (matches: (column: S) => boolean) => {
		const match = [...unpaired].find(matches);
		if (match) unpaired.delete(match);
		return match;
	};

	const pairedById = new Map(
		target.map((column) => [column, take(({ id }) => id !== undefined && id === column.id)]),
	);

	const pairs: Array<{ source: S; target: T }> = [];
	const removed: T[] = [];
	for (const column of target) {
		const match = pairedById.get(column) ?? take(({ name }) => name === column.name);
		if (match) pairs.push({ source: match, target: column });
		else removed.push(column);
	}

	return { pairs, added: source.filter((column) => unpaired.has(column)), removed };
}

/**
 * Orders the renames of kept (same type) column pairs so that each new name is
 * free when its rename runs. A retyped column is dropped first, so it holds no
 * name. Names compare case-insensitively, because SQLite column names are
 * case-insensitive. `blocked` holds the renames of swaps and cycles.
 */
export function orderColumnRenames<P extends ColumnPair>(
	pairs: P[],
): { ordered: P[]; blocked: P[] } {
	const keptPairs = pairs.filter(({ source, target }) => source.type === target.type);
	const liveNames = new Map(keptPairs.map((pair) => [pair, pair.target.name.toLowerCase()]));
	const ordered: P[] = [];
	let pending = keptPairs.filter(({ source, target }) => source.name !== target.name);

	while (pending.length > 0) {
		const next = pending.find((pair) => {
			const newName = pair.source.name.toLowerCase();
			return [...liveNames].every(([other, name]) => other === pair || name !== newName);
		});
		if (!next) break;
		ordered.push(next);
		liveNames.set(next, next.source.name.toLowerCase());
		pending = pending.filter((pair) => pair !== next);
	}

	return { ordered, blocked: pending };
}
