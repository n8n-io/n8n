import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateUsageTable1751932900000 implements ReversibleMigration {
	name = 'CreateUsageTable1751932900000';

	public async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// Drop and recreate usage_entity table
		await queryRunner.query(`DROP TABLE IF EXISTS \`${tablePrefix}usage_entity\``);

		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}usage_entity\` (` +
				'`usageId` int NOT NULL AUTO_INCREMENT, ' +
				'`workflowId` varchar(36) NOT NULL, ' +
				'`userId` varchar(36) NOT NULL, ' +
				'`executionDate` date NOT NULL, ' +
				'`tokensConsumed` bigint NOT NULL DEFAULT 0, ' +
				'`costIncurred` DECIMAL(20,10) NOT NULL DEFAULT 0, ' +
				`PRIMARY KEY (\`usageId\`)` +
				')',
		);

		// Create indexes to match entity definition and other database implementations
		await queryRunner.query(
			`CREATE INDEX \`IDX_${tablePrefix}usage_entity_userId_executionDate\` ON \`${tablePrefix}usage_entity\` (\`userId\`, \`executionDate\`)`,
		);

		await queryRunner.query(
			`CREATE UNIQUE INDEX \`IDX_${tablePrefix}usage_entity_workflowId_userId_executionDate\` ON \`${tablePrefix}usage_entity\` (\`workflowId\`, \`userId\`, \`executionDate\`)`,
		);
	}

	public async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS \`${tablePrefix}usage_entity\``);
	}
}
