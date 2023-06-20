import type { MigrationContext, ReversibleMigration } from '@db/types';

export class MigrateIntegerKeysToString1690000000002 implements ReversibleMigration {
	transaction = false as const;

	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query('PRAGMA foreign_keys=OFF');
		await queryRunner.startTransaction();
		await queryRunner.query(`
CREATE TABLE "${tablePrefix}TMP_workflow_entity" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text, "connections" text NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "settings" text, "staticData" text, "pinData" text, "versionId" varchar(36), "triggerCount" integer NOT NULL DEFAULT 0);`);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_workflow_entity" SELECT * FROM "${tablePrefix}workflow_entity";`,
		);
		await queryRunner.query('DROP TABLE "workflow_entity";');
		await queryRunner.query(`ALTER TABLE "${tablePrefix}TMP_workflow_entity" RENAME TO "${tablePrefix}workflow_entity";
`);

		await queryRunner.query(`
CREATE TABLE "${tablePrefix}TMP_tag_entity" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(24) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')));`);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_tag_entity" SELECT * FROM "${tablePrefix}tag_entity";`,
		);
		await queryRunner.query('DROP TABLE "tag_entity";');
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_tag_entity" RENAME TO "${tablePrefix}tag_entity";`,
		);

		await queryRunner.query(`
CREATE TABLE "${tablePrefix}TMP_workflows_tags" ("workflowId" varchar(36) NOT NULL, "tagId" integer NOT NULL, CONSTRAINT "FK_workflows_tags_workflow_entity" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_workflows_tags_tag_entity" FOREIGN KEY ("tagId") REFERENCES "${tablePrefix}tag_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("workflowId", "tagId"));`);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_workflows_tags" SELECT * FROM "${tablePrefix}workflows_tags";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}workflows_tags";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_workflows_tags" RENAME TO "${tablePrefix}workflows_tags";`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_workflows_tags_tag_id" ON "${tablePrefix}workflows_tags" ("tagId");`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_workflows_tags_workflow_id" ON "${tablePrefix}workflows_tags" ("workflowId");`,
		);

		await queryRunner.query(`CREATE TABLE "${tablePrefix}TMP_workflow_statistics" (
				"count" INTEGER DEFAULT 0,
				"latestEvent" DATETIME,
				"name" VARCHAR(128) NOT NULL,
				"workflowId" VARCHAR(36),
				PRIMARY KEY("workflowId", "name"),
				FOREIGN KEY("workflowId") REFERENCES "${tablePrefix}workflow_entity"("id") ON DELETE CASCADE
			);`);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_workflow_statistics" SELECT * FROM "${tablePrefix}workflow_statistics";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}workflow_statistics";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_workflow_statistics" RENAME TO "${tablePrefix}workflow_statistics";`,
		);

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}TMP_shared_workflow" (
				"createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"roleId" integer NOT NULL, "userId" varchar NOT NULL,
				"workflowId" VARCHAR(36) NOT NULL,
				CONSTRAINT "FK_shared_workflow_role" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
				CONSTRAINT "FK_shared_workflow_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
				CONSTRAINT "FK_shared_workflow_workflow_entity" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
				PRIMARY KEY ("userId", "workflowId"));`,
		);

		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_shared_workflow" SELECT * FROM "${tablePrefix}shared_workflow";`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}shared_workflow";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_shared_workflow" RENAME TO "${tablePrefix}shared_workflow";`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_shared_workflow_workflow_id" ON "${tablePrefix}shared_workflow" ("workflowId");`,
		);

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}TMP_webhook_entity" ("workflowId" varchar(36) NOT NULL, "webhookPath" varchar NOT NULL, "method" varchar NOT NULL, "node" varchar NOT NULL, "webhookId" varchar, "pathLength" integer, PRIMARY KEY ("webhookPath", "method"));`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_webhook_entity" SELECT * FROM "${tablePrefix}webhook_entity";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}webhook_entity";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_webhook_entity" RENAME TO "${tablePrefix}webhook_entity";`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_webhook_entity_webhook_path_method" ON "${tablePrefix}webhook_entity" ("webhookId","method","pathLength");`,
		);

		await queryRunner.query(`CREATE TABLE "${tablePrefix}TMP_execution_entity" (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
				"workflowId" varchar(36),
				"finished" boolean NOT NULL,
				"mode" varchar NOT NULL,
				"retryOf" varchar,
				"retrySuccessId" varchar,
				"startedAt" datetime NOT NULL,
				"stoppedAt" datetime,
				"waitTill" datetime,
				"workflowData" text NOT NULL,
				"data" text NOT NULL, "status" varchar,
				FOREIGN KEY("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE
			);`);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_execution_entity" SELECT * FROM "${tablePrefix}execution_entity";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_entity";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_execution_entity" RENAME TO "${tablePrefix}execution_entity";`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_execution_entity_stopped_at" ON "${tablePrefix}execution_entity" ("stoppedAt");`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_execution_entity_wait_till" ON "${tablePrefix}execution_entity" ("waitTill");`,
		);

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}TMP_credentials_entity" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(128) NOT NULL, "data" text NOT NULL, "type" varchar(32) NOT NULL, "nodesAccess" text NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')));`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_credentials_entity" SELECT * FROM "${tablePrefix}credentials_entity";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}credentials_entity";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_credentials_entity" RENAME TO "${tablePrefix}credentials_entity";`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_credentials_entity_type" ON "${tablePrefix}credentials_entity" ("type");`,
		);

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}TMP_shared_credentials" ("createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
			"updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
			"roleId" integer NOT NULL,
			"userId" varchar NOT NULL, "credentialsId" varchar(36) NOT NULL,
			CONSTRAINT "FK_shared_credentials_role" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
			CONSTRAINT "FK_shared_credentials_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
			CONSTRAINT "FK_shared_credentials_credentials" FOREIGN KEY ("credentialsId") REFERENCES "${tablePrefix}credentials_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("userId", "credentialsId"));`,
		);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_shared_credentials" SELECT * FROM "${tablePrefix}shared_credentials";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}shared_credentials";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_shared_credentials" RENAME TO "${tablePrefix}shared_credentials";`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_shared_credentials_credentials" ON "${tablePrefix}shared_credentials" ("credentialsId");`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "idx_shared_credentials_user_credentials" ON "${tablePrefix}shared_credentials" ("userId","credentialsId");`,
		);

		await queryRunner.query(`CREATE TABLE "${tablePrefix}TMP_variables" (
				id varchar(36) PRIMARY KEY NOT NULL,
				"key" TEXT NOT NULL,
				"type" TEXT NOT NULL DEFAULT ('string'),
				value TEXT,
				UNIQUE("key")
			);`);
		await queryRunner.query(
			`INSERT INTO "${tablePrefix}TMP_variables" SELECT * FROM "${tablePrefix}variables";`,
		);
		await queryRunner.query(`DROP TABLE "${tablePrefix}variables";`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_variables" RENAME TO "${tablePrefix}variables";`,
		);
		await queryRunner.query(`CREATE UNIQUE INDEX "idx_variables_key" ON "${tablePrefix}variables" ("key");
`);
		await queryRunner.commitTransaction();
		await queryRunner.query('PRAGMA foreign_keys=ON');
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
	async down({ queryRunner, tablePrefix }: MigrationContext) {}
}
