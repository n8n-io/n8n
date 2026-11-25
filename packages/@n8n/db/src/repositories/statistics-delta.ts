/** Claim the oldest PostgreSQL increments inside the statement that folds them. */
export function buildStatisticsDeltaClaimQuery(table: string, columns: string[]): string {
	return `DELETE FROM ${table}
		WHERE "id" IN (SELECT "id" FROM ${table} ORDER BY "id" LIMIT $1)
		RETURNING ${columns.join(', ')}`;
}
