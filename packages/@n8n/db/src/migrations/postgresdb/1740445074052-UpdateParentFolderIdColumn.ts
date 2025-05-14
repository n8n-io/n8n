import { UnexpectedError } from 'n8n-workflow';

import type { BaseMigration, MigrationContext } from '../migration-types';

export class UpdateParentFolderIdColumn1740445074052 implements BaseMigration {
	async up({
		escape,
		queryRunner,
		schemaBuilder: { dropForeignKey },
		tablePrefix,
	}: MigrationContext) {
		const workflowTableName = escape.tableName('workflow_entity');
		const folderTableName = escape.tableName('folder');
		const parentFolderIdColumn = escape.columnName('parentFolderId');
		const idColumn = escape.columnName('id');

		const workflowTable = await queryRunner.getTable(`${tablePrefix}workflow_entity`);

		if (!workflowTable) throw new UnexpectedError('Table workflow_entity not found');

		const foreignKey = workflowTable.foreignKeys.find(
			(fk) =>
				fk.columnNames.includes('parentFolderId') &&
				fk.referencedTableName === `${tablePrefix}folder`,
		);

		if (!foreignKey)
			throw new UnexpectedError('Foreign key in column parentFolderId was not found');

		await dropForeignKey('workflow_entity', 'parentFolderId', ['folder', 'id'], foreignKey.name);

		await queryRunner.query(
			`ALTER TABLE ${workflowTableName} ADD CONSTRAINT fk_workflow_parent_folder FOREIGN KEY (${parentFolderIdColumn}) REFERENCES ${folderTableName}(${idColumn}) ON DELETE CASCADE`,
		);
	}
}
