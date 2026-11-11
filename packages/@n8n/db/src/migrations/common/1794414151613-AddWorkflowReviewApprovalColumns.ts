import type { MigrationContext, ReversibleMigration } from '../migration-types';

const FLAGS = [
	{
		table: 'project',
		column: 'publishingNeedsApproval',
		comment:
			'When true, workflows in this project need an approved review before they can be published.',
	},
	{
		table: 'project',
		column: 'promotingNeedsApproval',
		comment:
			'When true, workflows in this project need an approved review before they can be promoted.',
	},
	{
		table: 'workflow_entity',
		column: 'publishingNeedsApproval',
		comment: 'When true, this workflow needs an approved review before it can be published.',
	},
	{
		table: 'workflow_entity',
		column: 'promotingNeedsApproval',
		comment: 'When true, this workflow needs an approved review before it can be promoted.',
	},
] as const;

/**
 * Adds the project and workflow approval flags. Both tables have incoming foreign
 * keys, so this uses ALTER TABLE instead of the DSL column helper, which recreates
 * the table on SQLite and would cascade-delete those rows.
 */
export class AddWorkflowReviewApprovalColumns1794414151613 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		for (const flag of FLAGS) {
			await this.addFlag(ctx, flag.table, flag.column, flag.comment);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		for (const flag of [...FLAGS].reverse()) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(flag.table)} DROP COLUMN ${escape.columnName(flag.column)}`,
			);
		}
	}

	private async addFlag(
		{ runQuery, escape, isPostgres }: MigrationContext,
		tableName: string,
		columnName: string,
		comment: string,
	) {
		const table = escape.tableName(tableName);
		const column = escape.columnName(columnName);
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} boolean NOT NULL DEFAULT false`);
		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${table}.${column} IS '${comment}'`);
		}
	}
}
