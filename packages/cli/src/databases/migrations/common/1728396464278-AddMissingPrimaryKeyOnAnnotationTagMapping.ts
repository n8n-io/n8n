import type { IrreversibleMigration, MigrationContext } from '@/databases/types';

export class AddMissingPrimaryKeyOnAnnotationTagMapping1728396464278
	implements IrreversibleMigration
{
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.createPrimaryKey(`${tablePrefix}execution_annotation_tags`, [
			'annotationId',
			'tagId',
		]);
	}
}
