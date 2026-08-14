export type MemoryLifecycleStatus = 'active' | 'superseded' | 'dropped';

export interface MemoryLifecycleState {
	status: MemoryLifecycleStatus;
	supersededBy: string | null;
}

export function activeLifecycleState(): { status: 'active'; supersededBy: null } {
	return { status: 'active', supersededBy: null };
}

export function droppedLifecycleState(): { status: 'dropped'; supersededBy: null } {
	return { status: 'dropped', supersededBy: null };
}

export function supersededLifecycleState(supersededBy: string): {
	status: 'superseded';
	supersededBy: string;
} {
	return { status: 'superseded', supersededBy };
}

export function markLifecycleActive(entry: MemoryLifecycleState): void {
	entry.status = 'active';
	entry.supersededBy = null;
}

export function markLifecycleDropped(entry: MemoryLifecycleState): void {
	entry.status = 'dropped';
	entry.supersededBy = null;
}

export function markLifecycleSuperseded(entry: MemoryLifecycleState, supersededBy: string): void {
	entry.status = 'superseded';
	entry.supersededBy = supersededBy;
}

export function uniqueStrings(values: Iterable<string>): string[] {
	const seen = new Set<string>();
	const unique: string[] = [];
	for (const value of values) {
		if (seen.has(value)) continue;
		seen.add(value);
		unique.push(value);
	}
	return unique;
}

export function normalizeFlatReflectionActions<
	TInput extends { supersedes: string[] },
	TOutput extends { supersedes: string[] },
>(opts: {
	activeIds: Iterable<string>;
	drop: string[];
	merge: TInput[];
	normalizeMerge: (entry: TInput, supersedes: string[]) => TOutput | null;
}): { drop: string[]; merge: TOutput[] } {
	const activeIds = new Set(opts.activeIds);
	const claimedIds = new Set<string>();
	const merge: TOutput[] = [];

	for (const item of opts.merge) {
		const supersedes = uniqueStrings(item.supersedes).filter(
			(id) => activeIds.has(id) && !claimedIds.has(id),
		);
		if (supersedes.length === 0) continue;

		const normalized = opts.normalizeMerge(item, supersedes);
		if (!normalized) continue;

		for (const id of supersedes) claimedIds.add(id);
		merge.push(normalized);
	}

	return {
		drop: uniqueStrings(opts.drop).filter((id) => activeIds.has(id) && !claimedIds.has(id)),
		merge,
	};
}
