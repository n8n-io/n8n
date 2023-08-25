import type { IrreversibleMigration, MigrationContext } from '@/databases/types';

export class ChangeVersionIdToUUID1692967111174 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}workflow_entity" ALTER "versionId" TYPE uuid USING "versionId"::uuid`,
		);
	}
}
