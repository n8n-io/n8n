import {MigrationInterface, QueryRunner} from "typeorm";

export class SetDefaultDates1620312176933 implements MigrationInterface {
		name = 'SetDefaultDates1620312176933';

		async up(queryRunner: QueryRunner): Promise<void> {
				await queryRunner.query(`DROP INDEX "public"."idx_07fde106c0b471d8cc80a64fc8"`);
				await queryRunner.query(`DROP INDEX "public"."idx_33228da131bb1112247cf52a42"`);
				await queryRunner.query(`DROP INDEX "public"."idx_c4d999a5e90784e8caccf5589d"`);
				await queryRunner.query(`DROP INDEX "public"."idx_812eb05f7451ca757fb98444ce"`);
				await queryRunner.query(`DROP INDEX "public"."idx_16f4436789e804e3e1c9eeb240"`);
				await queryRunner.query(`DROP INDEX "public"."idx_5e29bfe9e22c5d6567f509d4a4"`);
				await queryRunner.query(`DROP INDEX "public"."idx_31140eb41f019805b40d008744"`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "nodes" DROP NOT NULL`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
				await queryRunner.query(`CREATE INDEX "IDX_a4f6efa0088dedeae40189fac7" ON "public"."credentials_entity" ("type") `);
				await queryRunner.query(`CREATE INDEX "IDX_33228da131bb1112247cf52a42" ON "public"."execution_entity" ("stoppedAt") `);
				await queryRunner.query(`CREATE INDEX "IDX_11738b290192b21e3dd6cbeae9" ON "public"."execution_entity" ("workflowId") `);
				await queryRunner.query(`CREATE UNIQUE INDEX "IDX_812eb05f7451ca757fb98444ce" ON "public"."tag_entity" ("name") `);
				await queryRunner.query(`CREATE INDEX "IDX_16f4436789e804e3e1c9eeb240" ON "public"."webhook_entity" ("webhookId", "method", "pathLength") `);
				await queryRunner.query(`CREATE INDEX "IDX_31140eb41f019805b40d008744" ON "public"."workflows_tags" ("workflowId") `);
				await queryRunner.query(`CREATE INDEX "IDX_5e29bfe9e22c5d6567f509d4a4" ON "public"."workflows_tags" ("tagId") `);
		}

		async down(queryRunner: QueryRunner): Promise<void> {
				await queryRunner.query(`DROP INDEX "public"."IDX_5e29bfe9e22c5d6567f509d4a4"`);
				await queryRunner.query(`DROP INDEX "public"."IDX_31140eb41f019805b40d008744"`);
				await queryRunner.query(`DROP INDEX "public"."IDX_16f4436789e804e3e1c9eeb240"`);
				await queryRunner.query(`DROP INDEX "public"."IDX_812eb05f7451ca757fb98444ce"`);
				await queryRunner.query(`DROP INDEX "public"."IDX_11738b290192b21e3dd6cbeae9"`);
				await queryRunner.query(`DROP INDEX "public"."IDX_33228da131bb1112247cf52a42"`);
				await queryRunner.query(`DROP INDEX "public"."IDX_a4f6efa0088dedeae40189fac7"`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "updatedAt" DROP DEFAULT`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(6)`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "createdAt" DROP DEFAULT`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "createdAt" TYPE TIMESTAMP(6)`);
				await queryRunner.query(`ALTER TABLE "public"."workflow_entity" ALTER COLUMN "nodes" SET NOT NULL`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "updatedAt" DROP DEFAULT`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(6)`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "createdAt" DROP DEFAULT`);
				await queryRunner.query(`ALTER TABLE "public"."tag_entity" ALTER COLUMN "createdAt" TYPE TIMESTAMP(6)`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "updatedAt" DROP DEFAULT`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(6)`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "createdAt" DROP DEFAULT`);
				await queryRunner.query(`ALTER TABLE "public"."credentials_entity" ALTER COLUMN "createdAt" TYPE TIMESTAMP(6)`);
				await queryRunner.query(`CREATE INDEX "idx_31140eb41f019805b40d008744" ON "public"."workflows_tags" ("workflowId") `);
				await queryRunner.query(`CREATE INDEX "idx_5e29bfe9e22c5d6567f509d4a4" ON "public"."workflows_tags" ("tagId") `);
				await queryRunner.query(`CREATE INDEX "idx_16f4436789e804e3e1c9eeb240" ON "public"."webhook_entity" ("method", "webhookId", "pathLength") `);
				await queryRunner.query(`CREATE UNIQUE INDEX "idx_812eb05f7451ca757fb98444ce" ON "public"."tag_entity" ("name") `);
				await queryRunner.query(`CREATE INDEX "idx_c4d999a5e90784e8caccf5589d" ON "public"."execution_entity" ("workflowId") `);
				await queryRunner.query(`CREATE INDEX "idx_33228da131bb1112247cf52a42" ON "public"."execution_entity" ("stoppedAt") `);
				await queryRunner.query(`CREATE INDEX "idx_07fde106c0b471d8cc80a64fc8" ON "public"."credentials_entity" ("type") `);
		}

}
