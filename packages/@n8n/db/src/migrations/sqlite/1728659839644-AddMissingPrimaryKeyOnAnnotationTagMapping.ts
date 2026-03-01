import assert from 'node:assert';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const annotationsTableName = 'execution_annotations';
const annotationTagsTableName = 'annotation_tag_entity';
const annotationTagMappingsTableName = 'execution_annotation_tags';

export class AddMissingPrimaryKeyOnAnnotationTagMapping1728659839644
	implements IrreversibleMigration
{
	async up({
		queryRunner,
		tablePrefix,
		schemaBuilder: { createTable, column, dropIndex },
	}: MigrationContext) {
		// Check if the primary key already exists
		const table = await queryRunner.getTable(`${tablePrefix}execution_annotation_tags`);

		assert(table, 'execution_annotation_tags table not found');

		const hasPrimaryKey = table.primaryColumns.length > 0;

		// Do nothing if the primary key already exists
		if (hasPrimaryKey) {
			return;
		}

		// SQLite doesn't support adding a primary key to an existing table
		// So we have to do the following steps:

		// 1. Rename the existing table
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}${annotationTagMappingsTableName} RENAME TO ${tablePrefix}${annotationTagMappingsTableName}_tmp;`,
		);

		// 1.1 Drop the existing indices
		await dropIndex(`${annotationTagMappingsTableName}_tmp`, ['tagId'], {
			customIndexName: 'IDX_a3697779b366e131b2bbdae297',
		});
		await dropIndex(`${annotationTagMappingsTableName}_tmp`, ['annotationId'], {
			customIndexName: 'IDX_c1519757391996eb06064f0e7c',
		});

		// 	2. Create a new table with the desired structure
		await createTable(annotationTagMappingsTableName)
			.withColumns(
				column('annotationId').int.notNull.primary,
				column('tagId').varchar(24).notNull.primary,
			)
			.withForeignKey('annotationId', {
				tableName: annotationsTableName,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('tagId')
			.withIndexOn('annotationId')
			.withForeignKey('tagId', {
				tableName: annotationTagsTableName,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// 3. Copy data from the old table to the new one
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}${annotationTagMappingsTableName} SELECT * FROM ${tablePrefix}${annotationTagMappingsTableName}_tmp;`,
		);

		// 4. Drop the old table
		await queryRunner.dropTable(`${tablePrefix}${annotationTagMappingsTableName}_tmp`, true);
	}
}
