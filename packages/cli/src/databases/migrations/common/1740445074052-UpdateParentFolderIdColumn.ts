import type { BaseMigration, MigrationContext } from '@/databases/types';

export class UpdateParentFolderIdColumn1740445074052 implements BaseMigration {
	async up({
		escape,
		queryRunner,
		copyTable,
		schemaBuilder: { dropForeignKey, createTable, column },
		isPostgres,
		isMysql,
		tablePrefix,
	}: MigrationContext) {
		const workflowTableName = escape.tableName('workflow_entity');
		const folderTableName = escape.tableName('folder');
		const parentFolderIdColumn = escape.columnName('parentFolderId');
		const idColumn = escape.columnName('id');

		if (isMysql) {
			// Initial migration did not add the foreign key constraint so no need for the delete operation
			await queryRunner.query(
				`ALTER TABLE ${workflowTableName} ADD CONSTRAINT fk_workflow_parent_folder FOREIGN KEY (${parentFolderIdColumn}) REFERENCES ${folderTableName}(${idColumn}) ON DELETE CASCADE`,
			);
		} else if (isPostgres) {
			const workflowTable = await queryRunner.getTable(`${tablePrefix}workflow_entity`);

			if (workflowTable) {
				// Find the foreign key
				const foreignKey = workflowTable.foreignKeys.find(
					(fk) =>
						fk.columnNames.includes('parentFolderId') &&
						fk.referencedTableName === `${tablePrefix}folder`,
				);

				if (foreignKey) {
					await dropForeignKey(
						'workflow_entity',
						'parentFolderId',
						['folder', 'id'],
						foreignKey.name,
					);

					await queryRunner.query(
						`ALTER TABLE ${workflowTableName} ADD CONSTRAINT fk_workflow_parent_folder FOREIGN KEY (${parentFolderIdColumn}) REFERENCES ${folderTableName}(${idColumn}) ON DELETE CASCADE`,
					);
				}
			}
		} else {
			// SQLite
			await createTable('temp_workflow_entity')
				.withColumns(
					column('id').varchar(36).primary.notNull,
					column('name').varchar(128).notNull,
					column('active').bool.notNull,
					column('nodes').json,
					column('connections').json,
					column('settings').json,
					column('staticData').json,
					column('pinData').json,
					column('versionId').varchar(36),
					column('triggerCount').int.default(0),
					column('meta').json,
					column('parentFolderId').varchar(36).default(null),
				)
				.withForeignKey('parentFolderId', {
					tableName: 'folder',
					columnName: 'id',
					onDelete: 'CASCADE',
				})
				.withIndexOn(['name'], false).withTimestamps;

			const columns = [
				'id',
				'name',
				'active',
				'nodes',
				'connections',
				'settings',
				'staticData',
				'pinData',
				'versionId',
				'triggerCount',
				'meta',
				'parentFolderId',
				'createdAt',
				'updatedAt',
			];

			await copyTable(`${tablePrefix}workflow_entity`, 'temp_workflow_entity', columns);

			await queryRunner.query(`DROP TABLE "${tablePrefix}workflow_entity";`);

			await queryRunner.query(
				`ALTER TABLE "temp_workflow_entity" RENAME TO "${tablePrefix}workflow_entity";`,
			);
		}
	}
}
