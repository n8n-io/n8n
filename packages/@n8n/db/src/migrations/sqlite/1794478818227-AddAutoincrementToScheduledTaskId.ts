import { UnexpectedError } from 'n8n-workflow';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'scheduled_task';

export class AddAutoincrementToScheduledTaskId1794321432114 implements ReversibleMigration {
	async up(context: MigrationContext) {
		// Claim guards match on (id, leaseEpoch) and leaseEpoch restarts per row, so a deleted row's ID must never be reused.
		await setIdAutoincrement(context, true);
	}

	async down(context: MigrationContext) {
		await setIdAutoincrement(context, false);
	}
}

async function setIdAutoincrement(
	{ queryRunner, tablePrefix }: MigrationContext,
	enabled: boolean,
) {
	const tableName = `${tablePrefix}${table}`;
	const loaded = await queryRunner.getTable(tableName);
	const idColumn = loaded?.findColumnByName('id');
	if (!loaded || !idColumn) throw new UnexpectedError(`Column "id" not found on "${tableName}"`);

	const changed = idColumn.clone();
	changed.isGenerated = enabled;
	changed.generationStrategy = enabled ? 'increment' : undefined;
	await queryRunner.changeColumn(loaded, idColumn, changed);
}
