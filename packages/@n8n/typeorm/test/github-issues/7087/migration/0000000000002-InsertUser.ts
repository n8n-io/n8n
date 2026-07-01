import { MigrationInterface } from '../../../../src/migration/MigrationInterface';
import { QueryRunner } from '../../../../src/query-runner/QueryRunner';
import { User } from '../entity/user';

export class InsertUser0000000000002 implements MigrationInterface {
	public transaction = true;

	public up(queryRunner: QueryRunner): Promise<any> {
		const userRepo = queryRunner.connection.getRepository<User>(User);
		return userRepo.save(new User());
	}

	public down(queryRunner: QueryRunner): Promise<any> {
		return Promise.resolve();
	}
}
