import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateSelfHealingConfigurations1792250412594 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: {
				createTable,
				column,
				createIndex,
				addColumns,
				addForeignKey,
				dropForeignKey,
				dropIndex,
				dropColumns,
			},
			escape,
			isSqlite,
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

		// These opt-in tables contain development data only. Start from an empty development schema.
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
		await dropForeignKey('self_healing_result', 'suggestionId', ['workflow_suggestion', 'id']);
		await dropIndex('self_healing_result', ['suggestionId']);
		await dropColumns('self_healing_result', ['suggestionId'], { recreatesOnSqlite: true });
		await addColumns(
			'workflow_suggestion',
			[column('selfHealingResultId').varchar(36).notNull.comment('Owning self-healing result')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'workflow_suggestion',
			'selfHealingResultId',
			['self_healing_result', 'id'],
			'FK_workflow_suggestion_self_healing_result',
			'CASCADE',
		);
		await createIndex('workflow_suggestion', ['selfHealingResultId']);
	}

	async down({
		schemaBuilder: {
			dropForeignKey,
			dropIndex,
			dropColumns,
			dropTable,
			addColumns,
			column,
			addForeignKey,
			createIndex,
		},
		escape,
	}: MigrationContext) {
		await dropIndex('workflow_suggestion', ['selfHealingResultId']);
		await dropForeignKey(
			'workflow_suggestion',
			'selfHealingResultId',
			['self_healing_result', 'id'],
			'FK_workflow_suggestion_self_healing_result',
		);
		await dropColumns('workflow_suggestion', ['selfHealingResultId'], { recreatesOnSqlite: true });
		await addColumns(
			'self_healing_result',
			[column('suggestionId').varchar(36).comment('Optional isolated workflow suggestion')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'self_healing_result',
			'suggestionId',
			['workflow_suggestion', 'id'],
			undefined,
			'CASCADE',
		);
		await createIndex(
			'self_healing_result',
			['suggestionId'],
			true,
			undefined,
			`${escape.columnName('suggestionId')} IS NOT NULL`,
		);
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
