import { MigrationInterface } from '../../../../src/migration/MigrationInterface';
import { QueryRunner } from '../../../../src/query-runner/QueryRunner';

export class CreateIndex0000000000003 implements MigrationInterface {
	public transaction = false;

	public up(queryRunner: QueryRunner): Promise<any> {
		return queryRunner.query('CREATE INDEX CONCURRENTLY user_ids_idx ON users(id)');
	}

	public down(queryRunner: QueryRunner): Promise<any> {
		return Promise.resolve();
	}
}
