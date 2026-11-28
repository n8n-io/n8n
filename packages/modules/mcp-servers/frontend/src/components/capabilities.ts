export const CAPABILITY_ROW_ORDER = ['tools', 'workflows', 'agents'] as const;
export type CapabilityRowKind = (typeof CAPABILITY_ROW_ORDER)[number];

/** Node tools, agent tools, and the Skills panel stay hidden until their P1 tickets land. */
export const VISIBLE_CAPABILITY_ROWS: readonly CapabilityRowKind[] = ['workflows'];

/** Puts rows with items first and keeps the base order within each group. */
export function orderCapabilityRows(
	rows: readonly CapabilityRowKind[],
	counts: Partial<Record<CapabilityRowKind, number>>,
): CapabilityRowKind[] {
	const populated: CapabilityRowKind[] = [];
	const empty: CapabilityRowKind[] = [];
	for (const row of rows) {
		if ((counts[row] ?? 0) > 0) populated.push(row);
		else empty.push(row);
	}
	return [...populated, ...empty];
}
