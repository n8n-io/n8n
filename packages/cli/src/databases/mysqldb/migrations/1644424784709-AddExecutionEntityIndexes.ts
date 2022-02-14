import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class AddExecutionEntityIndexes1644424784709 implements MigrationInterface {
    name = 'AddExecutionEntityIndexes1644424784709'

    public async up(queryRunner: QueryRunner): Promise<void> {
		console.log('\n\nINFO: Started migration for execution entity indexes.\n      Depending on the number of saved executions, it may take a while.\n\n');

        const tablePrefix = config.get('database.tablePrefix');

        await queryRunner.query('DROP INDEX `IDX_c4d999a5e90784e8caccf5589d` ON `' + tablePrefix + 'execution_entity`');
        await queryRunner.query('DROP INDEX `IDX_ca4a71b47f28ac6ea88293a8e2` ON `' + tablePrefix + 'execution_entity`');
        await queryRunner.query('CREATE INDEX `IDX_06da892aaf92a48e7d3e400003` ON `' + tablePrefix + 'execution_entity` (`workflowId`, `waitTill`, `id`)');
        await queryRunner.query('CREATE INDEX `IDX_78d62b89dc1433192b86dce18a` ON `' + tablePrefix + 'execution_entity` (`workflowId`, `finished`, `id`)');
        await queryRunner.query('CREATE INDEX `IDX_1688846335d274033e15c846a4` ON `' + tablePrefix + 'execution_entity` (`finished`, `id`)');
        await queryRunner.query('CREATE INDEX `IDX_b94b45ce2c73ce46c54f20b5f9` ON `' + tablePrefix + 'execution_entity` (`waitTill`, `id`)');
        await queryRunner.query('CREATE INDEX `IDX_81fc04c8a17de15835713505e4` ON `' + tablePrefix + 'execution_entity` (`workflowId`, `id`)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query('DROP INDEX `IDX_81fc04c8a17de15835713505e4` ON `' + tablePrefix + 'execution_entity`');
        await queryRunner.query('DROP INDEX `IDX_b94b45ce2c73ce46c54f20b5f9` ON `' + tablePrefix + 'execution_entity`');
        await queryRunner.query('DROP INDEX `IDX_1688846335d274033e15c846a4` ON `' + tablePrefix + 'execution_entity`');
        await queryRunner.query('DROP INDEX `IDX_78d62b89dc1433192b86dce18a` ON `' + tablePrefix + 'execution_entity`');
        await queryRunner.query('DROP INDEX `IDX_06da892aaf92a48e7d3e400003` ON `' + tablePrefix + 'execution_entity`');
        await queryRunner.query('CREATE INDEX `IDX_ca4a71b47f28ac6ea88293a8e2` ON `' + tablePrefix + 'execution_entity` (`waitTill`)');
        await queryRunner.query('CREATE INDEX `IDX_c4d999a5e90784e8caccf5589d` ON `' + tablePrefix + 'execution_entity` (`workflowId`)');
    }

}
