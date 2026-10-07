import { UnexpectedError } from 'n8n-workflow';

import { AddInstanceScopeToAgents1791502107884 as BaseMigration } from '../common/1791502107884-AddInstanceScopeToAgents';
import type { MigrationContext } from '../migration-types';

type ForeignKeyViolation = { table: string; rowid: number | null; parent: string; fkid: number };
type ForeignKeyInfo = { id: number; from: string; on_delete: string };

/** Stops a cascade that does not converge. The real chain is a few levels deep. */
const maxCascadeDepth = 10;

/**
 * `agents` has incoming cascading foreign keys. Recreating it must not delete
 * their rows, so foreign keys are off for this migration.
 */
export class AddInstanceScopeToAgents1791502107884 extends BaseMigration {
	withFKsDisabled = true as const;

	/**
	 * Foreign keys are off, so SQLite does not cascade the delete. Apply each
	 * `ON DELETE` action by hand until no new violations remain. Violations that
	 * existed before the delete are not touched.
	 */
	protected override async deleteInstanceAgents(context: MigrationContext) {
		const { escape, runQuery, tablePrefix } = context;
		const key = (v: ForeignKeyViolation) => `${v.table}:${v.rowid}:${v.fkid}`;
		const before = new Set((await this.violations(context)).map(key));

		await super.deleteInstanceAgents(context);

		for (let depth = 0; depth < maxCascadeDepth; depth++) {
			const created = (await this.violations(context)).filter((v) => !before.has(key(v)));
			if (created.length === 0) return;

			for (const violation of created) {
				if (violation.rowid === null) continue;
				const tableName = escape.tableName(violation.table.slice(tablePrefix.length));
				const columns = (
					await runQuery<ForeignKeyInfo[]>(`PRAGMA foreign_key_list(${tableName})`)
				).filter((fk) => fk.id === violation.fkid);
				const action = columns[0]?.on_delete;

				if (action === 'CASCADE') {
					await runQuery(`DELETE FROM ${tableName} WHERE rowid = :rowid`, {
						rowid: violation.rowid,
					});
				} else if (action === 'SET NULL') {
					const assignments = columns
						.map((fk) => `${escape.columnName(fk.from)} = NULL`)
						.join(', ');
					await runQuery(`UPDATE ${tableName} SET ${assignments} WHERE rowid = :rowid`, {
						rowid: violation.rowid,
					});
				} else {
					throw new UnexpectedError(
						`Cannot revert: ${violation.table} row ${violation.rowid} references a deleted ${violation.parent} row (ON DELETE ${action ?? 'unknown'})`,
					);
				}
			}
		}
		throw new UnexpectedError(
			'Cannot revert: the cascade from the deleted instance agents did not converge',
		);
	}

	private async violations({ runQuery }: MigrationContext) {
		return await runQuery<ForeignKeyViolation[]>('PRAGMA foreign_key_check');
	}
}
