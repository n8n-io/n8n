import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentFolderPlacement1794325645791 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column, addForeignKey, createIndex },
			escape,
			queryRunner,
			tablePrefix,
		} = context;
		await addColumns(
			'folder',
			[
				column('resourceType')
					.varchar(16)
					.notNull.default("'workflow'")
					.withEnumCheck(['workflow', 'agent'])
					.comment('Resource tree: workflow or agent'),
			],
			{ recreatesOnSqlite: true },
		);

		await addColumns(
			'agents',
			[
				column('parentFolderId')
					.varchar(36)
					.comment('Agent folder ID, or null at the project root'),
			],
			{ recreatesOnSqlite: true },
		);

		await addForeignKey(
			'agents',
			'parentFolderId',
			['folder', 'id'],
			'FK_agents_parent_folder',
			'RESTRICT',
		);

		await queryRunner.createCheckConstraint(
			`${tablePrefix}agents`,
			new TableCheck({
				name: `CHK_${tablePrefix}agents_folder_scope`,
				expression: `${escape.columnName('scope')} != 'instance' OR ${escape.columnName('parentFolderId')} IS NULL`,
			}),
		);

		await createIndex(
			'agents',
			['projectId', 'parentFolderId'],
			false,
			'IDX_agents_project_folder',
		);
	}

	async down({
		schemaBuilder: { dropIndex, dropForeignKey, dropColumns, dropEnumCheck },
		queryRunner,
		tablePrefix,
	}: MigrationContext) {
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}agents`,
			`CHK_${tablePrefix}agents_folder_scope`,
		);
		await dropIndex('agents', ['projectId', 'parentFolderId'], {
			customIndexName: 'IDX_agents_project_folder',
		});

		await dropForeignKey('agents', 'parentFolderId', ['folder', 'id'], 'FK_agents_parent_folder');
		await dropColumns('agents', ['parentFolderId'], { recreatesOnSqlite: true });
		await dropEnumCheck('folder', 'resourceType', { recreatesOnSqlite: true });
		await dropColumns('folder', ['resourceType'], { recreatesOnSqlite: true });
	}
}
