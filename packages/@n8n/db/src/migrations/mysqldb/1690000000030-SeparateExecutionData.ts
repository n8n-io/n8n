import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class SeparateExecutionData1690000000030 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}execution_data (
				executionId int(11) NOT NULL primary key,
				workflowData json NOT NULL,
				data MEDIUMTEXT NOT NULL,
				CONSTRAINT \`${tablePrefix}execution_data_FK\` FOREIGN KEY (\`executionId\`) REFERENCES \`${tablePrefix}execution_entity\` (\`id\`) ON DELETE CASCADE
			)
			ENGINE=InnoDB`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}execution_data (
				executionId,
				workflowData,
				data)
				SELECT id, workflowData, data FROM ${tablePrefix}execution_entity
			`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity DROP COLUMN workflowData, DROP COLUMN data`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity
			ADD workflowData json NULL,
			ADD data MEDIUMTEXT NULL`,
		);

		await queryRunner.query(
			`UPDATE ${tablePrefix}execution_entity SET workflowData = ${tablePrefix}execution_data.workflowData, data = ${tablePrefix}execution_data.data
			FROM ${tablePrefix}execution_data WHERE ${tablePrefix}execution_data.executionId = ${tablePrefix}execution_entity.id`,
		);

		await queryRunner.query(`DROP TABLE ${tablePrefix}execution_data`);
	}
}
