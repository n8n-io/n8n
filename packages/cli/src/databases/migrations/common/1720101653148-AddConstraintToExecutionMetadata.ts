import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddConstraintToExecutionMetadata1720101653148 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { createTable, dropTable, column } = context.schemaBuilder;
		const { escape } = context;

		const executionMetadataTableRaw = 'execution_metadata';
		const executionMetadataTable = escape.tableName(executionMetadataTableRaw);
		const executionMetadataTableTempRaw = 'execution_metadata_temp';
		const executionMetadataTableTemp = escape.tableName(executionMetadataTableTempRaw);
		const id = escape.columnName('id');
		const executionId = escape.columnName('executionId');
		const key = escape.columnName('key');
		const value = escape.columnName('value');

		//CREATE TABLE `test_execution_metadata_temp` (`id` int NOT NULL AUTO_INCREMENT, `executionId` int NOT NULL, `key` text NOT NULL, `value` text NOT NULL, UNIQUE INDEX `IDX_1cd301d79996ba307cf3906f3e` (`executionId`, `key`), C ONSTRAINT `FK_8464d79ae0da9eca88e68bdb53b` FOREIGN KEY (`executionId`) REFERENCES `test_execution_entity` (`id`) ON DELETE CASCADE, PRIMARY KEY (`id`)) ENGINE=InnoDB
		//CREATE TABLE `test_execution_metadata_temp` (`id` int NOT NULL AUTO_INCREMENT, `executionId` int NOT NULL, `key` text NOT NULL, `value` text NOT NULL, CONSTRAINT `FK_8464d79ae0da9eca88e68bdb53b` FOREIGN KEY (`executionId`) REFERE NCES `test_execution_entity` (`id`) ON DELETE CASCADE, PRIMARY KEY (`id`)) ENGINE=InnoDB

		await createTable(executionMetadataTableTempRaw)
			.withColumns(
				column('id').int.notNull.primary.autoGenerate,
				column('executionId').int.notNull,
				// NOTE: This is a varchar(255) instead of text, because a unique index
				// on text is not supported on mysql, also why should we support
				// arbitrary length keys?
				column('key').varchar(255).notNull,
				column('value').text.notNull,
			)
			.withForeignKey('executionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['executionId', 'key'], true);

		await context.runQuery(`
			INSERT INTO ${executionMetadataTableTemp} (${id}, ${executionId}, ${key}, ${value})
			SELECT ${id}, ${executionId}, ${key}, ${value} FROM ${executionMetadataTable};
		`);

		await dropTable(executionMetadataTableRaw);
		await context.runQuery(
			`ALTER TABLE ${executionMetadataTableTemp} RENAME TO ${executionMetadataTable};`,
		);
	}

	async down(context: MigrationContext) {
		const { createTable, dropTable, column } = context.schemaBuilder;
		const { escape } = context;

		const executionMetadataTableRaw = 'execution_metadata';
		const executionMetadataTable = escape.tableName(executionMetadataTableRaw);
		const executionMetadataTableTempRaw = 'execution_metadata_temp';
		const executionMetadataTableTemp = escape.tableName(executionMetadataTableTempRaw);
		const id = escape.columnName('id');
		const executionId = escape.columnName('executionId');
		const key = escape.columnName('key');
		const value = escape.columnName('value');

		await createTable(executionMetadataTableTempRaw)
			.withColumns(
				column('id').int.notNull.primary.autoGenerate,
				column('executionId').int.notNull,
				column('key').text.notNull,
				column('value').text.notNull,
			)
			.withForeignKey('executionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
		//.withIndexOn(['executionId', 'key'], true);

		await context.runQuery(`
			INSERT INTO ${executionMetadataTableTemp} (${id}, ${executionId}, ${key}, ${value})
			SELECT ${id}, ${executionId}, ${key}, ${value} FROM ${executionMetadataTable};
		`);

		await dropTable(executionMetadataTableRaw);
		await context.runQuery(
			`ALTER TABLE ${executionMetadataTableTemp} RENAME TO ${executionMetadataTable};`,
		);
	}
}
