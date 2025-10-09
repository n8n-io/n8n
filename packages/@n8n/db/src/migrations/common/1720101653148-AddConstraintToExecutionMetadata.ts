import { nanoid } from 'nanoid';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

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
				// In MySQL foreignKey names must be unique across all tables and
				// TypeORM creates predictable names based on the columnName.
				// So the temp table's foreignKey clashes with the current table's.
				name: context.isMysql ? nanoid() : undefined,
			})
			.withIndexOn(['executionId', 'key'], true);

		if (context.isMysql) {
			await context.runQuery(`
				INSERT INTO ${executionMetadataTableTemp} (${id}, ${executionId}, ${key}, ${value})
				SELECT MAX(${id}) as ${id}, ${executionId}, ${key}, MAX(${value})
				FROM ${executionMetadataTable}
				GROUP BY ${executionId}, ${key}
				ON DUPLICATE KEY UPDATE
						id = IF(VALUES(${id}) > ${executionMetadataTableTemp}.${id}, VALUES(${id}), ${executionMetadataTableTemp}.${id}),
						value = IF(VALUES(${id}) > ${executionMetadataTableTemp}.${id}, VALUES(${value}), ${executionMetadataTableTemp}.${value});
				`);
		} else {
			await context.runQuery(`
			INSERT INTO ${executionMetadataTableTemp} (${id}, ${executionId}, ${key}, ${value})
			SELECT MAX(${id}) as ${id}, ${executionId}, ${key}, MAX(${value})
			FROM ${executionMetadataTable}
			GROUP BY ${executionId}, ${key}
			ON CONFLICT (${executionId}, ${key}) DO UPDATE SET
					id = EXCLUDED.id,
					value = EXCLUDED.value
			WHERE EXCLUDED.id > ${executionMetadataTableTemp}.id;
		`);
		}

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
				// INFO: The PK names that TypeORM creates are predictable and thus it
				// will create a PK name which already exists in the current
				// execution_metadata table. That's why we have to randomize the PK name
				// here.
				column('id').int.notNull.primaryWithName(nanoid()).autoGenerate,
				column('executionId').int.notNull,
				column('key').text.notNull,
				column('value').text.notNull,
			)
			.withForeignKey('executionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				// In MySQL foreignKey names must be unique across all tables and
				// TypeORM creates predictable names based on the columnName.
				// So the temp table's foreignKey clashes with the current table's.
				name: context.isMysql ? nanoid() : undefined,
			});

		await context.runQuery(`
			INSERT INTO ${executionMetadataTableTemp} (${id}, ${executionId}, ${key}, ${value})
			SELECT ${id}, ${executionId}, ${key}, ${value} FROM ${executionMetadataTable};
		`);

		await dropTable(executionMetadataTableRaw);
		await context.runQuery(
			`ALTER TABLE ${executionMetadataTableTemp} RENAME TO ${executionMetadataTable};`,
		);

		if (context.dbType === 'postgresdb') {
			// Update sequence so that inserts continue with the next highest id.
			const tableName = escape.tableName('execution_metadata');
			const sequenceName = escape.tableName('execution_metadata_temp_id_seq1');

			await context.runQuery(
				`SELECT setval('${sequenceName}', (SELECT MAX(id) FROM ${tableName}));`,
			);
		}
	}
}
