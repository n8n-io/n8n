import {MigrationInterface, QueryRunner} from "typeorm";

import * as config from '../../../../config';

export class MakeStoppedAtNullable1607431743766 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
