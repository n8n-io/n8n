import {MigrationInterface, QueryRunner} from "typeorm";

export class InitialMigration1587628010571 implements MigrationInterface {
    name = 'InitialMigration1587628010571'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE test_table (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            second_name TEXT NOT NULL
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE test_table`);
    }



/**
 * await queryRunner.query(`ALTER TABLE credentials_entity RENAME TO _credentials_entity_old`, undefined);
        await queryRunner.query(`CREATE TABLE credentials_entity ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "testCol" text)`, undefined);
        await queryRunner.query(`INSERT INTO credentials_entity (id, name, data, type, nodesAccess, createdAt, updatedAt) SELECT id, name, data, type, nodesAccess, createdAt, updatedAt FROM _credentials_entity_old`) */}
