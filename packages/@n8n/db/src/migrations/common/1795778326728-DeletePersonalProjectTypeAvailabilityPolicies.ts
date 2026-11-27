import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const DELETE_BATCH_SIZE = 500;

/**
 * Only a team project can have a node or credential type policy. Before the server checked the
 * project type, an admin could write one on a personal project through the API. This deletes
 * those scopes, their attachments, and the documents that only they used.
 *
 * Irreversible: the deleted rows are not kept anywhere, so a `down()` could not restore them.
 */
export class DeletePersonalProjectTypeAvailabilityPolicies1795778326728
	implements IrreversibleMigration
{
	async up(ctx: MigrationContext) {
		const policyIds = await this.findPersonalOnlyPolicyIds(ctx);
		const [{ count }] = await ctx.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM (${this.personalScopeIds(ctx)}) personal`,
		);
		await this.deletePersonalProjectScopes(ctx);
		await this.deletePolicies(ctx, policyIds);

		// The deleted rows leave no audit trail, so the log is the only record of the cleanup.
		if (Number(count) > 0) {
			ctx.logger.info(
				`[${ctx.migrationName}] Deleted ${count} personal-project policy scope(s) and ${policyIds.length} document(s)`,
			);
		}
	}

	/** Personal-project scope ids, as a subquery. */
	private personalScopeIds({ escape }: MigrationContext) {
		const id = escape.columnName('id');

		return `SELECT s.${id} FROM ${escape.tableName('type_availability_policy_scope')} s
			JOIN ${escape.tableName('project')} p ON p.${id} = s.${escape.columnName('projectId')}
			WHERE p.${escape.columnName('type')} = 'personal'`;
	}

	private async findPersonalOnlyPolicyIds(ctx: MigrationContext): Promise<string[]> {
		const { escape, runQuery } = ctx;
		const attachmentTable = escape.tableName('type_availability_policy_attachment');
		const scopeId = escape.columnName('scopeId');
		const policyId = escape.columnName('policyId');
		const personalScopeIds = this.personalScopeIds(ctx);

		const rows = await runQuery<Array<{ policyId: string }>>(
			`SELECT DISTINCT a.${policyId} AS ${policyId} FROM ${attachmentTable} a
			WHERE a.${scopeId} IN (${personalScopeIds})
			AND NOT EXISTS (
				SELECT 1 FROM ${attachmentTable} other
				WHERE other.${policyId} = a.${policyId}
				AND other.${scopeId} NOT IN (${personalScopeIds})
			)`,
		);

		return rows.map((row) => row.policyId);
	}

	private async deletePersonalProjectScopes(ctx: MigrationContext) {
		const { escape, runQuery } = ctx;
		const personalScopeIds = this.personalScopeIds(ctx);

		// SQLite runs migrations with foreign keys off, so the scope FK does not cascade here.
		await runQuery(
			`DELETE FROM ${escape.tableName('type_availability_policy_attachment')}
			WHERE ${escape.columnName('scopeId')} IN (${personalScopeIds})`,
		);
		await runQuery(
			`DELETE FROM ${escape.tableName('type_availability_policy_scope')}
			WHERE ${escape.columnName('id')} IN (${personalScopeIds})`,
		);
	}

	private async deletePolicies({ escape, runQuery }: MigrationContext, ids: string[]) {
		// Each id is one bind parameter, so batches stay under SQLite's parameter limit.
		for (let start = 0; start < ids.length; start += DELETE_BATCH_SIZE) {
			await runQuery(
				`DELETE FROM ${escape.tableName('type_availability_policy')}
				WHERE ${escape.columnName('id')} IN (:...ids)`,
				{ ids: ids.slice(start, start + DELETE_BATCH_SIZE) },
			);
		}
	}
}
