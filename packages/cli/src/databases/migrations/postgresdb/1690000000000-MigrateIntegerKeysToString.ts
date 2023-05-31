import type { MigrationContext, ReversibleMigration } from '@db/types';

export class MigrateIntegerKeysToString1690000000000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
ALTER TABLE ${tablePrefix}workflow_entity RENAME COLUMN id to tmp_id;
ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN id varchar(36);
UPDATE ${tablePrefix}workflow_entity SET id = tmp_id::text;
ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN id SET NOT NULL;
ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN tmp_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS ${tablePrefix}workflow_entity_id_seq;
CREATE UNIQUE INDEX "pk_workflow_entity_id" ON ${tablePrefix}workflow_entity ("id");

ALTER TABLE ${tablePrefix}tag_entity RENAME COLUMN id to tmp_id;
ALTER TABLE ${tablePrefix}tag_entity ADD COLUMN id varchar(36);
UPDATE ${tablePrefix}tag_entity SET id = tmp_id::text;
ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN id SET NOT NULL;
ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN tmp_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS tag_entity_id_seq;
CREATE UNIQUE INDEX "pk_tag_entity_id" ON ${tablePrefix}tag_entity ("id");

ALTER TABLE ${tablePrefix}workflows_tags RENAME COLUMN "workflowId" to "tmp_workflowId";
ALTER TABLE ${tablePrefix}workflows_tags ADD COLUMN "workflowId" varchar(36);
UPDATE ${tablePrefix}workflows_tags SET "workflowId" = "tmp_workflowId"::text;
ALTER TABLE ${tablePrefix}workflows_tags ALTER COLUMN "workflowId" SET NOT NULL;
ALTER TABLE ${tablePrefix}workflows_tags RENAME COLUMN "tagId" to "tmp_tagId";
ALTER TABLE ${tablePrefix}workflows_tags ADD COLUMN "tagId" varchar(36);
UPDATE ${tablePrefix}workflows_tags SET "tagId" = "tmp_tagId"::text;
ALTER TABLE ${tablePrefix}workflows_tags ALTER COLUMN "tagId" SET NOT NULL;
ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT IF EXISTS "FK_31140eb41f019805b40d0087449";
ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT IF EXISTS "FK_5e29bfe9e22c5d6567f509d4a46";
CREATE UNIQUE INDEX "pk_workflows_tags" ON ${tablePrefix}workflows_tags ("workflowId","tagId");
DROP INDEX IF EXISTS "idx_31140eb41f019805b40d008744";
ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT "PK_a60448a90e51a114e95e2a125b3",
    ADD CONSTRAINT "pk_workflows_tags" PRIMARY KEY USING INDEX "pk_workflows_tags";
CREATE INDEX "idx_workflows_tags_workflow_id" ON ${tablePrefix}workflows_tags ("workflowId");
ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT "fk_workflows_tags_workflow_id" FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT "fk_workflows_tags_tag_id" FOREIGN KEY ("tagId") REFERENCES tag_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE ${tablePrefix}workflows_tags DROP COLUMN "tmp_workflowId";
ALTER TABLE ${tablePrefix}workflows_tags DROP COLUMN "tmp_tagId";

ALTER TABLE ${tablePrefix}shared_workflow RENAME COLUMN "workflowId" to "tmp_workflowId";
ALTER TABLE ${tablePrefix}shared_workflow ADD COLUMN "workflowId" varchar(36);
UPDATE ${tablePrefix}shared_workflow SET "workflowId" = "tmp_workflowId"::text;
ALTER TABLE ${tablePrefix}shared_workflow ALTER COLUMN "workflowId" SET NOT NULL;
CREATE UNIQUE INDEX "pk_shared_workflow_id" ON ${tablePrefix}shared_workflow ("userId","workflowId");
DROP INDEX IF EXISTS "IDX_65a0933c0f19d278881653bf81d35064";
ALTER TABLE ${tablePrefix}shared_workflow DROP CONSTRAINT "PK_cc5d5a71c7b2591f5154ffb0c785e85e",
    ADD CONSTRAINT "pk_shared_workflow_id" PRIMARY KEY USING INDEX "pk_shared_workflow_id";
CREATE INDEX "idx_shared_workflow_workflow_id" ON ${tablePrefix}shared_workflow ("workflowId");
ALTER TABLE ${tablePrefix}shared_workflow ADD CONSTRAINT "fk_shared_workflow_workflow_id" FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE ${tablePrefix}shared_workflow DROP COLUMN "tmp_workflowId";

ALTER TABLE ${tablePrefix}workflow_statistics RENAME COLUMN "workflowId" to "tmp_workflowId";
ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN "workflowId" varchar(36);
UPDATE ${tablePrefix}workflow_statistics SET "workflowId" = "tmp_workflowId"::text;
ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "workflowId" SET NOT NULL;
CREATE UNIQUE INDEX "pk_workflow_statistics" ON ${tablePrefix}workflow_statistics ("workflowId","name");
ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "workflow_statistics_pkey",
    ADD CONSTRAINT "pk_workflow_statistics" PRIMARY KEY USING INDEX "pk_workflow_statistics";
ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN "tmp_workflowId";
ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT "fk_workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE ${tablePrefix}webhook_entity RENAME COLUMN "workflowId" to "tmp_workflowId";
ALTER TABLE ${tablePrefix}webhook_entity ADD COLUMN "workflowId" varchar(36);
UPDATE ${tablePrefix}webhook_entity SET "workflowId" = "tmp_workflowId"::text;
ALTER TABLE ${tablePrefix}webhook_entity ALTER COLUMN "workflowId" SET NOT NULL;
ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "tmp_workflowId";
ALTER TABLE ${tablePrefix}webhook_entity ADD CONSTRAINT "fk_webhook_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE ${tablePrefix}execution_entity RENAME COLUMN "workflowId" to "tmp_workflowId";
-- Intentionally NOT setting colum to NOT NULL
ALTER TABLE ${tablePrefix}execution_entity ADD COLUMN "workflowId" varchar(36);
UPDATE ${tablePrefix}execution_entity SET "workflowId" = "tmp_workflowId"::text;
DROP INDEX IF EXISTS "IDX_d160d4771aba5a0d78943edbe3";
DROP INDEX IF EXISTS "IDX_4f474ac92be81610439aaad61e";
DROP INDEX IF EXISTS "IDX_58154df94c686818c99fb754ce";
-- index idx_33228da131bb1112247cf52a42 is a duplicate of IDX_33228da131bb1112247cf52a42
DROP INDEX IF EXISTS "idx_33228da131bb1112247cf52a42";
CREATE INDEX "idx_execution_entity_workflow_id_id" ON ${tablePrefix}execution_entity ("workflowId","id");
CREATE INDEX "idx_execution_entity_workflow_id_finished_id" ON ${tablePrefix}execution_entity ("workflowId","finished","id");
CREATE INDEX "idx_execution_entity_workflow_id_wait_till_id" ON ${tablePrefix}execution_entity ("workflowId","waitTill","id");
ALTER TABLE ${tablePrefix}execution_entity DROP COLUMN "tmp_workflowId";
-- FK was missing in prev schema - should it be added?
ALTER TABLE ${tablePrefix}execution_entity ADD CONSTRAINT "fk_execution_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE ${tablePrefix}workflow_entity DROP CONSTRAINT IF EXISTS "pk_eded7d72664448da7745d551207";
ALTER TABLE ${tablePrefix}workflow_entity ADD PRIMARY KEY (id);
ALTER TABLE ${tablePrefix}tag_entity DROP CONSTRAINT IF EXISTS "PK_7a50a9b74ae6855c0dcaee25052";
ALTER TABLE ${tablePrefix}tag_entity ADD PRIMARY KEY (id);
ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN tmp_id;
ALTER TABLE ${tablePrefix}tag_entity DROP COLUMN tmp_id;

ALTER TABLE ${tablePrefix}credentials_entity RENAME COLUMN id to tmp_id;
ALTER TABLE ${tablePrefix}credentials_entity ADD COLUMN id varchar(36);
UPDATE ${tablePrefix}credentials_entity SET id = tmp_id::text;
ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN id SET NOT NULL;
ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN tmp_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS credentials_entity_id_seq;
CREATE UNIQUE INDEX "pk_credentials_entity_id" ON ${tablePrefix}credentials_entity ("id");
 
ALTER TABLE ${tablePrefix}shared_credentials RENAME COLUMN "credentialsId" to "tmp_credentialsId";
ALTER TABLE ${tablePrefix}shared_credentials ADD COLUMN "credentialsId" varchar(36);
UPDATE ${tablePrefix}shared_credentials SET "credentialsId" = "tmp_credentialsId"::text;
ALTER TABLE ${tablePrefix}shared_credentials ALTER COLUMN "credentialsId" SET NOT NULL;
CREATE UNIQUE INDEX "pk_shared_credentials_id" ON ${tablePrefix}shared_credentials ("userId","credentialsId");
DROP INDEX IF EXISTS "IDX_829d16efa0e265cb076d50eca8d21733";
ALTER TABLE ${tablePrefix}shared_credentials DROP CONSTRAINT "PK_10dd1527ffb639609be7aadd98f628c6",
    ADD CONSTRAINT "pk_shared_credentials_id" PRIMARY KEY USING INDEX "pk_shared_credentials_id";
CREATE INDEX "idx_shared_credentials_credentials_id" ON ${tablePrefix}shared_credentials ("credentialsId");
ALTER TABLE ${tablePrefix}shared_credentials ADD CONSTRAINT "fk_shared_credentials_credentials_id" FOREIGN KEY ("credentialsId") REFERENCES credentials_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE ${tablePrefix}shared_credentials DROP COLUMN "tmp_credentialsId";

ALTER TABLE ${tablePrefix}credentials_entity DROP CONSTRAINT IF EXISTS "pk_814c3d3c36e8a27fa8edb761b0e";
ALTER TABLE ${tablePrefix}credentials_entity ADD PRIMARY KEY (id);
ALTER TABLE ${tablePrefix}credentials_entity DROP COLUMN tmp_id;

ALTER TABLE ${tablePrefix}variables RENAME COLUMN id to tmp_id;
ALTER TABLE ${tablePrefix}variables ADD COLUMN id varchar(36);
UPDATE ${tablePrefix}variables SET id = tmp_id::text;
ALTER TABLE ${tablePrefix}variables ALTER COLUMN id SET NOT NULL;
ALTER TABLE ${tablePrefix}variables ALTER COLUMN tmp_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS variables_id_seq;
CREATE UNIQUE INDEX "pk_variables_id" ON ${tablePrefix}variables ("id");
ALTER TABLE ${tablePrefix}variables DROP CONSTRAINT IF EXISTS "variables_pkey";
ALTER TABLE ${tablePrefix}variables ADD PRIMARY KEY (id);
ALTER TABLE ${tablePrefix}variables DROP COLUMN tmp_id;
		`);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
	async down({ queryRunner, tablePrefix }: MigrationContext) {}
}
