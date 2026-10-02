import { MigrationInterface, QueryRunner, TableColumn } from '../../../../src';
import { testColumnName, testTableName, nonExistentColumnName } from '../issue-6195';

export class MigrationToFakeRun implements MigrationInterface {
	name = 'MigrationToFakeRun' + Date.now();

	async up(queryRunner: QueryRunner) {
		await queryRunner.addColumn(
			testTableName,
			new TableColumn({
				name: testColumnName,
				type: 'varchar',
			}),
		);
	}

	async down(queryRunner: QueryRunner) {
		await queryRunner.dropColumn(testTableName, nonExistentColumnName);
	}
}
