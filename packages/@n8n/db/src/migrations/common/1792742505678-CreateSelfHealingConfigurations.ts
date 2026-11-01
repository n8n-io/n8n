import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateSelfHealingConfigurations1792742505678 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { createTable, column, createIndex, addColumns, addForeignKey },
			escape,
			isSqlite,
			runQuery,
		} = ctx;
		// Deleted IDs must not identify replacement configurations in delayed requests.
		const id = isSqlite
			? column('id').int.primary.autoGenerate
			: column('id').int.primary.autoGenerate2;
		await createTable('self_healing_configuration')
			.withColumns(
				id,
				column('projectId').varchar(36).notNull,
				column('scope')
					.varchar(16)
					.notNull.withEnumCheck(['all', 'selected'])
					.comment('All project workflows or explicit selections'),
				column('enabled').bool.notNull.default(false),
				column('enabledById').uuid.comment('User whose access authorizes future investigations'),
			)
			.withTimestamps.withIndexOn('projectId')
			.withIndexOn('enabledById')
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('enabledById', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });
		await createIndex(
			'self_healing_configuration',
			['projectId'],
			true,
			undefined,
			`${escape.columnName('scope')} = 'all'`,
		);
		await createTable('self_healing_configuration_workflow')
			.withColumns(
				column('configurationId').int.primary,
				column('workflowId').varchar(36).primary,
				column('projectId')
					.varchar(36)
					.notNull.comment('Enforces disjoint selections within a project'),
			)
			.withIndexOn(['projectId', 'workflowId'], true)
			.withIndexOn('workflowId')
			.withForeignKey('configurationId', {
				tableName: 'self_healing_configuration',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' });
		await createTable('self_healing_configuration_reviewer')
			.withColumns(column('configurationId').int.primary, column('userId').uuid.primary)
			.withIndexOn('userId')
			.withForeignKey('configurationId', {
				tableName: 'self_healing_configuration',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' });

		// Existing rows have no configuration. Clear them before adding the required reference.
		await runQuery(`DELETE FROM ${escape.tableName('self_healing_investigation')}`);
		await runQuery(`DELETE FROM ${escape.tableName('self_healing_result')}`);

		for (const table of ['self_healing_result', 'self_healing_investigation']) {
			await addColumns(table, [column('configurationId').int.notNull], { recreatesOnSqlite: true });
			await addForeignKey(
				table,
				'configurationId',
				['self_healing_configuration', 'id'],
				`FK_${table}_configuration`,
				'CASCADE',
			);
			await createIndex(table, ['configurationId']);
		}
	}

	async down({
		schemaBuilder: { dropForeignKey, dropIndex, dropColumns, dropTable },
	}: MigrationContext) {
		for (const table of ['self_healing_investigation', 'self_healing_result']) {
			await dropIndex(table, ['configurationId']);
			await dropForeignKey(
				table,
				'configurationId',
				['self_healing_configuration', 'id'],
				`FK_${table}_configuration`,
			);
			await dropColumns(table, ['configurationId'], { recreatesOnSqlite: true });
		}
		await dropTable('self_healing_configuration_reviewer');
		await dropTable('self_healing_configuration_workflow');
		await dropTable('self_healing_configuration');
	}
}
