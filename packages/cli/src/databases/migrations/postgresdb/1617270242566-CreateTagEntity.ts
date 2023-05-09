import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateTagEntity1617270242566 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// create tags table + relationship with workflow entity

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}tag_entity ("id" SERIAL NOT NULL, "name" character varying(24) NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_${tablePrefix}7a50a9b74ae6855c0dcaee25052" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX IDX_${tablePrefix}812eb05f7451ca757fb98444ce ON ${tablePrefix}tag_entity ("name") `,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}workflows_tags ("workflowId" integer NOT NULL, "tagId" integer NOT NULL, CONSTRAINT "PK_${tablePrefix}a60448a90e51a114e95e2a125b3" PRIMARY KEY ("workflowId", "tagId"))`,
		);
		await queryRunner.query(
			`CREATE INDEX IDX_${tablePrefix}31140eb41f019805b40d008744 ON ${tablePrefix}workflows_tags ("workflowId") `,
		);
		await queryRunner.query(
			`CREATE INDEX IDX_${tablePrefix}5e29bfe9e22c5d6567f509d4a4 ON ${tablePrefix}workflows_tags ("tagId") `,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT "FK_${tablePrefix}31140eb41f019805b40d0087449" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity ("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT "FK_${tablePrefix}5e29bfe9e22c5d6567f509d4a46" FOREIGN KEY ("tagId") REFERENCES ${tablePrefix}tag_entity ("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		// set default dates for `createdAt` and `updatedAt`

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// `createdAt` and `updatedAt`

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" DROP DEFAULT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" DROP DEFAULT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" DROP DEFAULT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" DROP DEFAULT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" DROP DEFAULT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" DROP DEFAULT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP`,
		);

		// tags

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT "FK_${tablePrefix}5e29bfe9e22c5d6567f509d4a46"`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT "FK_${tablePrefix}31140eb41f019805b40d0087449"`,
		);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}5e29bfe9e22c5d6567f509d4a4`);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}31140eb41f019805b40d008744`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}workflows_tags`);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}812eb05f7451ca757fb98444ce`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}tag_entity`);
	}
}
