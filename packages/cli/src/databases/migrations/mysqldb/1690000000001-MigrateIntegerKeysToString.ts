import type { MigrationContext, ReversibleMigration } from '@db/types';

export class MigrateIntegerKeysToString1690000000001 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity RENAME COLUMN id to tmp_id;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD COLUMN id varchar(36) NOT NULL;`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}workflow_entity SET id = CONVERT(tmp_id, CHAR);`);
		await queryRunner.query(
			`CREATE INDEX \`TMP_idx_workflow_entity_id\` ON ${tablePrefix}workflow_entity (\`id\`);`,
		);

		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity RENAME COLUMN id to tmp_id;`);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity ADD COLUMN id varchar(36) NOT NULL;`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}tag_entity SET id = CONVERT(tmp_id, CHAR);`);
		await queryRunner.query(
			`CREATE INDEX \`TMP_idx_tag_entity_id\` ON ${tablePrefix}tag_entity (\`id\`);`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags RENAME COLUMN \`workflowId\` to \`tmp_workflowId\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD COLUMN \`workflowId\` varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflows_tags SET \`workflowId\` = CONVERT(\`tmp_workflowId\`, CHAR);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags RENAME COLUMN \`tagId\` to \`tmp_tagId\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD COLUMN \`tagId\` varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflows_tags SET \`tagId\` = CONVERT(\`tmp_tagId\`, CHAR);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP CONSTRAINT \`PRIMARY\`, ADD PRIMARY KEY (\`workflowId\`, \`tagId\`);`,
		);
		await queryRunner.query(
			`CREATE INDEX \`idx_workflows_tags_workflowid\` ON ${tablePrefix}workflows_tags (\`workflowId\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP FOREIGN KEY \`FK_54b2f0343d6a2078fa137443869\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT \`fk_workflows_tags_workflow_id\` FOREIGN KEY (\`workflowId\`) REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP FOREIGN KEY \`FK_77505b341625b0b4768082e2171\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags ADD CONSTRAINT \`fk_workflows_tags_tag_id\` FOREIGN KEY (\`tagId\`) REFERENCES tag_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflows_tags DROP COLUMN \`tmp_workflowId\`;`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflows_tags DROP COLUMN \`tmp_tagId\`;`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow RENAME COLUMN \`workflowId\` to \`tmp_workflowId\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow ADD COLUMN \`workflowId\` varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}shared_workflow SET \`workflowId\` = CONVERT(\`tmp_workflowId\`, CHAR);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow DROP CONSTRAINT \`PRIMARY\`, ADD PRIMARY KEY (\`userId\`, \`workflowId\`);`,
		);
		await queryRunner.query(
			`CREATE INDEX \`idx_shared_workflow_workflow_id\` ON ${tablePrefix}shared_workflow (\`workflowId\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow DROP FOREIGN KEY \`FK_b83f8d2530884b66a9c848c8b88\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow ADD CONSTRAINT \`fk_shared_workflow_workflow_id\` FOREIGN KEY (\`workflowId\`) REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_workflow DROP COLUMN \`tmp_workflowId\`;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics RENAME COLUMN \`workflowId\` to \`tmp_workflowId\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN \`workflowId\` varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflow_statistics SET \`workflowId\` = CONVERT(\`tmp_workflowId\`, CHAR);`,
		);
		await queryRunner.query(
			`CREATE INDEX \`idx_workflow_statistics_workflow_id\` ON ${tablePrefix}workflow_statistics (\`workflowId\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP FOREIGN KEY \`workflow_statistics_ibfk_1\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT \`fk_workflow_statistics_workflow_id\` FOREIGN KEY (\`workflowId\`) REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT \`PRIMARY\`, ADD PRIMARY KEY (\`workflowId\`, \`name\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN \`tmp_workflowId\`;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity RENAME COLUMN \`workflowId\` to \`tmp_workflowId\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity ADD COLUMN \`workflowId\` varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}webhook_entity SET \`workflowId\` = CONVERT(\`tmp_workflowId\`, CHAR);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN \`tmp_workflowId\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity ADD CONSTRAINT \`fk_webhook_entity_workflow_id\` FOREIGN KEY (\`workflowId\`) REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity RENAME COLUMN \`workflowId\` to \`tmp_workflowId\`;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity ADD COLUMN \`workflowId\` varchar(36);`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}execution_entity SET \`workflowId\` = CONVERT(\`tmp_workflowId\`, CHAR);`,
		);
		await queryRunner.query(
			`CREATE INDEX \`idx_execution_entity_workflow_id_id\` ON ${tablePrefix}execution_entity (\`workflowId\`,\`id\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity DROP FOREIGN KEY \`FK_execution_entity_workflowId\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity ADD CONSTRAINT \`fk_execution_entity_workflow_id\` FOREIGN KEY (\`workflowId\`) REFERENCES workflow_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_81fc04c8a17de15835713505e4\` ON ${tablePrefix}execution_entity;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}execution_entity DROP COLUMN \`tmp_workflowId\`;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity MODIFY COLUMN tmp_id INT NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity DROP CONSTRAINT \`PRIMARY\`, ADD PRIMARY KEY (\`id\`);`,
		);
		await queryRunner.query(
			`DROP INDEX \`TMP_idx_workflow_entity_id\` ON ${tablePrefix}workflow_entity;`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity DROP COLUMN tmp_id;`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity MODIFY COLUMN tmp_id INT NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}tag_entity DROP CONSTRAINT \`PRIMARY\`, ADD PRIMARY KEY (\`id\`);`,
		);
		await queryRunner.query(`DROP INDEX \`TMP_idx_tag_entity_id\` ON ${tablePrefix}tag_entity;`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity DROP COLUMN tmp_id;`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity RENAME COLUMN id to tmp_id;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ADD COLUMN id varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}credentials_entity SET id = CONVERT(tmp_id, CHAR);`,
		);
		await queryRunner.query(
			`CREATE INDEX \`TMP_idx_credentials_entity_id\` ON ${tablePrefix}credentials_entity (\`id\`);`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials RENAME COLUMN credentialsId to tmp_credentialsId;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials ADD COLUMN credentialsId varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}shared_credentials SET credentialsId = CONVERT(tmp_credentialsId, CHAR);`,
		);
		await queryRunner.query(
			`CREATE INDEX \`idx_shared_credentials_id\` ON ${tablePrefix}shared_credentials (\`credentialsId\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials DROP FOREIGN KEY \`FK_68661def1d4bcf2451ac8dbd949\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials ADD CONSTRAINT \`fk_shared_credentials_credentials_id\` FOREIGN KEY (\`credentialsId\`) REFERENCES credentials_entity(id) ON DELETE CASCADE ON UPDATE NO ACTION;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials MODIFY COLUMN tmp_credentialsId INT NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials DROP CONSTRAINT \`PRIMARY\`, ADD PRIMARY KEY (\`userId\`,\`credentialsId\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}shared_credentials DROP COLUMN tmp_credentialsId;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity MODIFY COLUMN tmp_id INT NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity DROP CONSTRAINT \`PRIMARY\`, ADD PRIMARY KEY (\`id\`);`,
		);
		await queryRunner.query(
			`DROP INDEX \`TMP_idx_credentials_entity_id\` ON ${tablePrefix}credentials_entity;`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity DROP COLUMN tmp_id;`);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}variables RENAME COLUMN \`id\` to \`tmp_id\`;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}variables ADD COLUMN \`id\` varchar(36) NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}variables SET \`id\` = CONVERT(\`tmp_id\`, CHAR);`,
		);
		await queryRunner.query(
			`CREATE INDEX \`TMP_idx_variables_id\` ON ${tablePrefix}variables (\`id\`);`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}variables CHANGE \`tmp_id\` \`tmp_id\` int NOT NULL;`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}variables DROP PRIMARY KEY, ADD PRIMARY KEY (\`id\`);`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}variables DROP COLUMN \`tmp_id\`;`);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
	async down({ queryRunner, tablePrefix }: MigrationContext) {}
}
