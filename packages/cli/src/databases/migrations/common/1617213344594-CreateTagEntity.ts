import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateTagEntity1617213344594 implements ReversibleMigration {
	protected nameIndexName = '8f949d7a3a984759044054e89b';

	protected workflowIdIndexName = '54b2f0343d6a2078fa13744386';

	protected tagIdIndexName = '77505b341625b0b4768082e217';

	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('tag_entity')
			.withColumns(column('id').int.primary.autoGenerate, column('name').varchar(24).notNull)
			.withTimestamps.withIndexOn('name', { isUnique: true, name: this.nameIndexName });

		await createTable('workflows_tags')
			.withColumns(column('workflowId').int.primary, column('tagId').int.primary)
			.withIndexOn('workflowId', { name: this.workflowIdIndexName })
			.withIndexOn('tagId', { name: this.tagIdIndexName })
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('tagId', { tableName: 'tag_entity', columnName: 'id', onDelete: 'CASCADE' });
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflows_tags');
		await dropTable('tag_entity');
	}
}
