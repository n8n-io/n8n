import type { MigrationContext, IrreversibleMigration } from '../migration-types';

export class MigrateTestDefinitionKeyToString1731582748663 implements IrreversibleMigration {
	transaction = false as const;

	async up(context: MigrationContext) {
		const { queryRunner, tablePrefix } = context;

		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}TMP_test_definition" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(255) NOT NULL, "workflowId" varchar(36) NOT NULL, "evaluationWorkflowId" varchar(36), "annotationTagId" varchar(16), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "description" text, CONSTRAINT "FK_${tablePrefix}test_definition_annotation_tag" FOREIGN KEY ("annotationTagId") REFERENCES "annotation_tag_entity" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_${tablePrefix}test_definition_evaluation_workflow_entity" FOREIGN KEY ("evaluationWorkflowId") REFERENCES "workflow_entity" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_${tablePrefix}test_definition_workflow_entity" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);`);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_test_definition" SELECT * FROM "${tablePrefix}test_definition";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}test_definition";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_test_definition" RENAME TO "${tablePrefix}test_definition";`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_${tablePrefix}test_definition_workflow_id" ON "${tablePrefix}test_definition" ("workflowId");`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_${tablePrefix}test_definition_evaluation_workflow_id" ON "${tablePrefix}test_definition" ("evaluationWorkflowId");`,
		);
	}
}
