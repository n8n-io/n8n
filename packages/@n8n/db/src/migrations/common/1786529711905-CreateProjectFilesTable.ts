import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'project_files';

export class CreateProjectFilesTable1786529711905 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').varchar(36).primary.comment('Application-generated n8n nano ID'),
				// varchar(36) mirrors the referenced project.id primary key.
				column('projectId').varchar(36).notNull,
				column('name')
					.varchar(255)
					.notNull.comment(
						'Human handle, unique per project; slashes are plain characters, not folders',
					),
				column('storedAt')
					.varchar(2)
					.notNull.default("'fs'")
					.withEnumCheck(['fs', 's3', 'az', 'db'])
					.comment(
						"Where the file bytes live: 'db' (binary_data table), or a blob-storage backend ('fs', 's3', 'az')",
					),
				column('storageKey').text.notNull.comment(
					'Key addressing the bytes within storedAt: a binary_data.fileId for db, a byte-store key otherwise. Not a foreign key. Replace swaps this to a freshly written key',
				),
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').bigint.notNull.comment(
					"Content size in bytes; SUM()'d for the instance-wide storage quota",
				),
			)
			.withIndexOn(['projectId', 'name'], true)
			.withIndexOn(['projectId', 'updatedAt'])
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
