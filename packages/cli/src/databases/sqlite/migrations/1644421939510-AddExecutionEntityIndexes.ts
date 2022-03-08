import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class AddExecutionEntityIndexes1644421939510 implements MigrationInterface {
    name = 'AddExecutionEntityIndexes1644421939510'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('\n\nINFO: Started migration for execution entity indexes.\n      Depending on the number of saved executions, it may take a while.\n\n');

        const tablePrefix = config.get('database.tablePrefix');

        await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2'`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}06da892aaf92a48e7d3e400003' ON '${tablePrefix}execution_entity' ('workflowId', 'waitTill', 'id') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}78d62b89dc1433192b86dce18a' ON '${tablePrefix}execution_entity' ('workflowId', 'finished', 'id') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}1688846335d274033e15c846a4' ON '${tablePrefix}execution_entity' ('finished', 'id') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}b94b45ce2c73ce46c54f20b5f9' ON '${tablePrefix}execution_entity' ('waitTill', 'id') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}81fc04c8a17de15835713505e4' ON '${tablePrefix}execution_entity' ('workflowId', 'id') `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tablePrefix = config.get('database.tablePrefix');

        await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}81fc04c8a17de15835713505e4'`);
        await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}b94b45ce2c73ce46c54f20b5f9'`);
        await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}1688846335d274033e15c846a4'`);
        await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}78d62b89dc1433192b86dce18a'`);
        await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}06da892aaf92a48e7d3e400003'`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2' ON '${tablePrefix}execution_entity' ('waitTill') `);
    }

}
