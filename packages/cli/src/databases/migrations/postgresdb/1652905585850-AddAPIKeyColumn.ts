import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class AddAPIKeyColumn1652905585850 implements MigrationInterface {
	name = 'AddAPIKeyColumn1652905585850';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" ADD COLUMN "apiKey" VARCHAR(255)`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "UQ_${tablePrefix}ie0zomxves9w3p774drfrkxtj5" ON "${tablePrefix}user" ("apiKey")`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP INDEX "UQ_${tablePrefix}ie0zomxves9w3p774drfrkxtj5"`);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN "apiKey"`);
	}
}
