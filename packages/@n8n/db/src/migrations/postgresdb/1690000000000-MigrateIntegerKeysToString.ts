import type { MigrationContext, IrreversibleMigration } from '../migration-types';

export class MigrateIntegerKeysToString1690000000000 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity RENAME COLUMN id to tmp_id;`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN id varchar(36);`);
		await queryRunner.query(`UPDATE ${tablePrefix}workflow_entity SET id = tmp_id::text;`);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN id SET NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN tmp_id DROP DEFAULT;`,
		);
		await queryRunner.query(`DROP SEQUENCE IF EXISTS ${tablePrefix}workflow_entity_id_seq;`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}workflow_entity_id" ON ${tablePrefix}workflow_entity ("id");`,
		);

		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity RENAME COLUMN id to tmp_id;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ADD COLUMN id varchar(36);`);
		await queryRunner.query(`UPDATE ${tablePrefix}tag_entity SET id = tmp_id::text;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN id SET NOT NULL;`);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN tmp_id DROP DEFAULT;`,
		);
		await queryRunner.query(`DROP SEQUENCE IF EXISTS ${tablePrefix}tag_entity_id_seq;`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}tag_entity_id" ON ${tablePrefix}tag_entity ("id");`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags RENAME COLUMN "workflowId" to "tmp_workflowId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD COLUMN "workflowId" varchar(36);`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflows_tags SET "workflowId" = "tmp_workflowId"::text;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ALTER COLUMN "workflowId" SET NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags RENAME COLUMN "tagId" to "tmp_tagId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD COLUMN "tagId" varchar(36);`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}workflows_tags SET "tagId" = "tmp_tagId"::text;`);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ALTER COLUMN "tagId" SET NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT IF EXISTS "FK_${tablePrefix}31140eb41f019805b40d0087449";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT IF EXISTS "FK_${tablePrefix}5e29bfe9e22c5d6567f509d4a46";`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}workflows_tags" ON ${tablePrefix}workflows_tags ("workflowId","tagId");`,
		);
		await queryRunner.query(`DROP INDEX IF EXISTS "idx_${tablePrefix}31140eb41f019805b40d008744";`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT IF EXISTS "PK_${tablePrefix}a60448a90e51a114e95e2a125b3",
	ADD CONSTRAINT "pk_${tablePrefix}workflows_tags" PRIMARY KEY USING INDEX "pk_${tablePrefix}workflows_tags";`);
		await queryRunner.query(
			`CREATE INDEX "idx_${tablePrefix}workflows_tags_workflow_id" ON ${tablePrefix}workflows_tags ("workflowId");`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT "fk_${tablePrefix}workflows_tags_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT "fk_${tablePrefix}workflows_tags_tag_id" FOREIGN KEY ("tagId") REFERENCES ${tablePrefix}tag_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP COLUMN "tmp_workflowId";`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflows_tags DROP COLUMN "tmp_tagId";`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow RENAME COLUMN "workflowId" to "tmp_workflowId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow ADD COLUMN "workflowId" varchar(36);`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}shared_workflow SET "workflowId" = "tmp_workflowId"::text;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow ALTER COLUMN "workflowId" SET NOT NULL;`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}shared_workflow_id" ON ${tablePrefix}shared_workflow ("userId","workflowId");`,
		);
		await queryRunner.query(
			`DROP INDEX IF EXISTS "IDX_${tablePrefix}65a0933c0f19d278881653bf81d35064";`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}shared_workflow DROP CONSTRAINT "PK_${tablePrefix}cc5d5a71c7b2591f5154ffb0c785e85e",
	ADD CONSTRAINT "pk_${tablePrefix}shared_workflow_id" PRIMARY KEY USING INDEX "pk_${tablePrefix}shared_workflow_id";`);
		await queryRunner.query(
			`CREATE INDEX "idx_${tablePrefix}shared_workflow_workflow_id" ON ${tablePrefix}shared_workflow ("workflowId");`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow ADD CONSTRAINT "fk_${tablePrefix}shared_workflow_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow DROP COLUMN "tmp_workflowId";`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics RENAME COLUMN "workflowId" to "tmp_workflowId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN "workflowId" varchar(36);`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflow_statistics SET "workflowId" = "tmp_workflowId"::text;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "workflowId" SET NOT NULL;`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}workflow_statistics" ON ${tablePrefix}workflow_statistics ("workflowId","name");`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "${tablePrefix}workflow_statistics_pkey",
	ADD CONSTRAINT "pk_${tablePrefix}workflow_statistics" PRIMARY KEY USING INDEX "pk_${tablePrefix}workflow_statistics";`);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN "tmp_workflowId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT "fk_${tablePrefix}workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity RENAME COLUMN "workflowId" to "tmp_workflowId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity ADD COLUMN "workflowId" varchar(36);`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}webhook_entity SET "workflowId" = "tmp_workflowId"::text;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity ALTER COLUMN "workflowId" SET NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "tmp_workflowId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity ADD CONSTRAINT "fk_${tablePrefix}webhook_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity RENAME COLUMN "workflowId" to "tmp_workflowId";`,
		);
		// -- Intentionally NOT setting colum to NOT NULL
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity ADD COLUMN "workflowId" varchar(36);`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}execution_entity SET "workflowId" = "tmp_workflowId"::text;`,
		);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}d160d4771aba5a0d78943edbe3";`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}4f474ac92be81610439aaad61e";`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}58154df94c686818c99fb754ce";`);
		// -- index idx_33228da131bb1112247cf52a42 is a duplicate of IDX_33228da131bb1112247cf52a42
		await queryRunner.query(`DROP INDEX IF EXISTS "idx_${tablePrefix}33228da131bb1112247cf52a42";`);
		await queryRunner.query(
			`CREATE INDEX "idx_${tablePrefix}execution_entity_workflow_id_id" ON ${tablePrefix}execution_entity ("workflowId","id");`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity DROP COLUMN "tmp_workflowId";`,
		);
		// -- FK was missing in prev schema - should it be added?
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity ADD CONSTRAINT "fk_${tablePrefix}execution_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity DROP CONSTRAINT IF EXISTS "pk_${tablePrefix}eded7d72664448da7745d551207";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity DROP CONSTRAINT IF EXISTS "PK_${tablePrefix}7a50a9b74ae6855c0dcaee25052";`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN tmp_id;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity DROP COLUMN tmp_id;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ADD PRIMARY KEY (id);`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ADD PRIMARY KEY (id);`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity RENAME COLUMN id to tmp_id;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ADD COLUMN id varchar(36);`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}credentials_entity SET id = tmp_id::text;`);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN id SET NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN tmp_id DROP DEFAULT;`,
		);
		await queryRunner.query(`DROP SEQUENCE IF EXISTS ${tablePrefix}credentials_entity_id_seq;`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}credentials_entity_id" ON ${tablePrefix}credentials_entity ("id");`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials RENAME COLUMN "credentialsId" to "tmp_credentialsId";`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials ADD COLUMN "credentialsId" varchar(36);`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}shared_credentials SET "credentialsId" = "tmp_credentialsId"::text;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials ALTER COLUMN "credentialsId" SET NOT NULL;`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}shared_credentials_id" ON ${tablePrefix}shared_credentials ("userId","credentialsId");`,
		);
		await queryRunner.query(
			`DROP INDEX IF EXISTS "IDX_${tablePrefix}829d16efa0e265cb076d50eca8d21733";`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}shared_credentials DROP CONSTRAINT "PK_${tablePrefix}10dd1527ffb639609be7aadd98f628c6",
	ADD CONSTRAINT "pk_${tablePrefix}shared_credentials_id" PRIMARY KEY USING INDEX "pk_${tablePrefix}shared_credentials_id";`);
		await queryRunner.query(
			`CREATE INDEX "idx_${tablePrefix}shared_credentials_credentials_id" ON ${tablePrefix}shared_credentials ("credentialsId");`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials ADD CONSTRAINT "fk_${tablePrefix}shared_credentials_credentials_id" FOREIGN KEY ("credentialsId") REFERENCES ${tablePrefix}credentials_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials DROP COLUMN "tmp_credentialsId";`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity DROP CONSTRAINT IF EXISTS "pk_${tablePrefix}814c3d3c36e8a27fa8edb761b0e";`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity DROP COLUMN tmp_id;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ADD PRIMARY KEY (id);`);

		await queryRunner.query(`ALTER TABLE ${tablePrefix}variables RENAME COLUMN id to tmp_id;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}variables ADD COLUMN id varchar(36);`);
		await queryRunner.query(`UPDATE ${tablePrefix}variables SET id = tmp_id::text;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}variables ALTER COLUMN id SET NOT NULL;`);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}variables ALTER COLUMN tmp_id DROP DEFAULT;`,
		);
		await queryRunner.query(`DROP SEQUENCE IF EXISTS ${tablePrefix}variables_id_seq;`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "pk_${tablePrefix}variables_id" ON ${tablePrefix}variables ("id");`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}variables DROP CONSTRAINT IF EXISTS "${tablePrefix}variables_pkey";`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}variables DROP COLUMN tmp_id;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}variables ADD PRIMARY KEY (id);`);
	}
}
