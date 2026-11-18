/**
 * The tables that an approval card showed. The runtime stores this with the
 * suspended call and gives it back on resume, so the tool can check that an
 * approval still applies to the same tables.
 */
import { z } from 'zod';

import type { ChangePlan } from './change-data-tables.validate';

const approvedTablesSchema = z.object({
	tables: z.array(z.object({ index: z.number().int().nonnegative(), tableId: z.string() })),
});

export type ApprovedTables = z.infer<typeof approvedTablesSchema>;

/** One entry for each change on an existing table. Tables that the batch creates have no ID yet. */
export function approvedTablesOf(plan: ChangePlan): ApprovedTables {
	const tables = plan.changes.flatMap(({ index, table }) =>
		table.kind === 'existing' ? [{ index, tableId: table.id }] : [],
	);
	return { tables };
}

/**
 * True when a change now targets another table than the card showed. A card
 * without stored tables (older cards) counts as unchanged.
 */
export function approvedTablesChanged(plan: ChangePlan, continuation: unknown): boolean {
	const parsed = approvedTablesSchema.safeParse(continuation);
	if (!parsed.success) return false;
	return parsed.data.tables.some(({ index, tableId }) => {
		const table = plan.changes.find((planned) => planned.index === index)?.table;
		return table?.kind !== 'existing' || table.id !== tableId;
	});
}
