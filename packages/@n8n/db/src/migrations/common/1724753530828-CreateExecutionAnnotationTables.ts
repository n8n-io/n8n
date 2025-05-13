import type { MigrationContext, ReversibleMigration } from '../migration-types';

const annotationsTableName = 'execution_annotations';
const annotationTagsTableName = 'annotation_tag_entity';
const annotationTagMappingsTableName = 'execution_annotation_tags';

export class CreateAnnotationTables1724753530828 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(annotationsTableName)
			.withColumns(
				column('id').int.notNull.primary.autoGenerate,
				column('executionId').int.notNull,
				column('vote').varchar(6),
				column('note').text,
			)
			.withIndexOn('executionId', true)
			.withForeignKey('executionId', {
				tableName: 'execution_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(annotationTagsTableName)
			.withColumns(column('id').varchar(16).primary.notNull, column('name').varchar(24).notNull)
			.withIndexOn('name', true).withTimestamps;

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
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(annotationTagMappingsTableName);
		await dropTable(annotationTagsTableName);
		await dropTable(annotationsTableName);
	}
}
