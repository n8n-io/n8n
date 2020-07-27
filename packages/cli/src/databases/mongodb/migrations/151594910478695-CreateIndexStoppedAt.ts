import { MigrationInterface } from "typeorm";
import {
	MongoQueryRunner,
} from 'typeorm/driver/mongodb/MongoQueryRunner';

import * as config from '../../../../config';

export class CreateIndexStoppedAt1594910478695 implements MigrationInterface {
	name = 'CreateIndexStoppedAt1594910478695';

	async up(queryRunner: MongoQueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.manager.createCollectionIndex(`${tablePrefix}execution_entity`, 'stoppedAt', { name: `IDX_${tablePrefix}execution_entity_stoppedAt` });
	}

	async down(queryRunner: MongoQueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.manager.dropCollectionIndex
			(`${tablePrefix}execution_entity`, `IDX_${tablePrefix}execution_entity_stoppedAt`);
	}

}
