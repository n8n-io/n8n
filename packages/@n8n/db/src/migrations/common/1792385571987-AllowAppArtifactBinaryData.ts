import { UserError } from 'n8n-workflow';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];

export class AllowAppArtifactBinaryData1792385571987 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		await this.replaceSourceTypeCheck(ctx, [...sourceTypesBefore, 'app_artifact']);
	}

	async down(ctx: MigrationContext) {
		const [row] = await ctx.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${ctx.escape.tableName('binary_data')} WHERE ${ctx.escape.columnName('sourceType')} = 'app_artifact'`,
		);
		if (Number(row.count) > 0) {
			throw new UserError('Remove database-backed app artifacts before reverting this migration.');
		}
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
	}

	private async replaceSourceTypeCheck(
		{ schemaBuilder: { dropEnumCheck, addEnumCheck } }: MigrationContext,
		values: string[],
	) {
		await dropEnumCheck('binary_data', 'sourceType', { recreatesOnSqlite: true });
		await addEnumCheck('binary_data', 'sourceType', values, { recreatesOnSqlite: true });
	}
}
