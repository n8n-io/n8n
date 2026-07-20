import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'role_mapping_rule';

/**
 * IAM-1047: Allow role mapping rules with no assigned role. A NULL role means
 * the rule blocks access — a matching login is denied instead of being
 * assigned a role (exposed in the API as the `block:access` sentinel).
 */
export class MakeRoleMappingRuleRoleNullable1784556173999 implements ReversibleMigration {
	async up({ schemaBuilder: { dropNotNull } }: MigrationContext) {
		await dropNotNull(table, 'role', { recreatesOnSqlite: true });
	}

	async down(context: MigrationContext) {
		// The previous schema cannot represent block-access rules; drop them
		// before restoring the NOT NULL constraint.
		const { schemaBuilder, escape, runQuery, logger, migrationName } = context;
		const tableName = escape.tableName(table);
		const roleColumn = escape.columnName('role');

		const [{ count }] = await runQuery<Array<{ count: number }>>(
			`SELECT COUNT(*) as count FROM ${tableName} WHERE ${roleColumn} IS NULL`,
		);
		if (Number(count) > 0) {
			logger.warn(`[${migrationName}] Deleting ${count} block-access role mapping rule(s)`);
			await runQuery(`DELETE FROM ${tableName} WHERE ${roleColumn} IS NULL`);
		}

		await schemaBuilder.addNotNull(table, 'role', { recreatesOnSqlite: true });
	}
}
