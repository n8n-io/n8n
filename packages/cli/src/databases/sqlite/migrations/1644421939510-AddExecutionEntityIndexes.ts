import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class AddExecutionEntityIndexes1644421939510 implements MigrationInterface {
    name = 'AddExecutionEntityIndexes1644421939510'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('\n\nINFO: Started migration for execution entity indexes.\n      Depending on the number of saved executions, it may take a while.\n\n');

        const tablePrefix = config.get('database.tablePrefix');

        await queryRunner.query(`CREATE INDEX 'IDX_${tablePrefix}c4d999a5e90784e8caccf5589d' ON '${tablePrefix}execution_entity' ('workflowId') `);
        await queryRunner.query(`CREATE INDEX 'IDX_${tablePrefix}6ae042c4077371a63aee762839' ON '${tablePrefix}execution_entity' ('waitTill') `);
        await queryRunner.query(`CREATE INDEX 'IDX_${tablePrefix}06da892aaf92a48e7d3e400003' ON '${tablePrefix}execution_entity' ('id', 'workflowId', 'waitTill') `);
        await queryRunner.query(`CREATE INDEX 'IDX_${tablePrefix}78d62b89dc1433192b86dce18a' ON '${tablePrefix}execution_entity' ('id', 'workflowId', 'finished') `);
        await queryRunner.query(`CREATE INDEX 'IDX_${tablePrefix}81fc04c8a17de15835713505e4' ON '${tablePrefix}execution_entity' ('id', 'workflowId') `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tablePrefix = config.get('database.tablePrefix');

        await queryRunner.query(`DROP INDEX 'IDX_${tablePrefix}81fc04c8a17de15835713505e4'`);
        await queryRunner.query(`DROP INDEX 'IDX_${tablePrefix}78d62b89dc1433192b86dce18a'`);
        await queryRunner.query(`DROP INDEX 'IDX_${tablePrefix}06da892aaf92a48e7d3e400003'`);
        await queryRunner.query(`DROP INDEX 'IDX_${tablePrefix}6ae042c4077371a63aee762839'`);
        await queryRunner.query(`DROP INDEX 'IDX_${tablePrefix}c4d999a5e90784e8caccf5589d'`);
        await queryRunner.query(`DROP INDEX 'IDX_${tablePrefix}943d8f922be094eb507cb9a7f9'`);
    }

}
