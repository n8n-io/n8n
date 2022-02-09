import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';

export class AddExecutionEntityIndexes1644422880309 implements MigrationInterface {
    name = 'AddExecutionEntityIndexes1644422880309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('\n\nINFO: Started migration for execution entity indexes.\n      Depending on the number of saved executions, it may take a while.\n\n');

        let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');

        if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefixPure}11738b290192b21e3dd6cbeae9' ON ${tablePrefix}execution_entity ('workflowId') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefixPure}13f37c629fb4c12ced1af027b2' ON ${tablePrefix}execution_entity ('waitTill') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefixPure}58154df94c686818c99fb754ce' ON ${tablePrefix}execution_entity ('id', 'workflowId', 'waitTill') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefixPure}4f474ac92be81610439aaad61e' ON ${tablePrefix}execution_entity ('id', 'workflowId', 'finished') `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefixPure}d160d4771aba5a0d78943edbe3' ON ${tablePrefix}execution_entity ('id', 'workflowId') `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');

        if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

        await queryRunner.query(`DROP INDEX '${schema}'.IDX_${tablePrefixPure}d160d4771aba5a0d78943edbe3'`);
        await queryRunner.query(`DROP INDEX '${schema}'.'IDX_${tablePrefixPure}4f474ac92be81610439aaad61e'`);
        await queryRunner.query(`DROP INDEX '${schema}'.'IDX_${tablePrefixPure}58154df94c686818c99fb754ce'`);
        await queryRunner.query(`DROP INDEX '${schema}'.'IDX_${tablePrefixPure}13f37c629fb4c12ced1af027b2'`);
        await queryRunner.query(`DROP INDEX '${schema}'.'IDX_${tablePrefixPure}11738b290192b21e3dd6cbeae9'`);
    }

}
