import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateCredentialUsageTable1665484192211 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}credential_usage" (` +
				'"workflowId"	integer NOT NULL,' +
				'"nodeId"	varchar NOT NULL,' +
				'"credentialId"	integer NOT NULL,' +
				"\"createdAt\"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')'," +
				"\"updatedAt\"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')'," +
				'PRIMARY KEY("workflowId", "nodeId", "credentialId"), ' +
				`CONSTRAINT "FK_${tablePrefix}518e1ece107b859ca6ce9ed2487f7e23" FOREIGN KEY ("workflowId") REFERENCES "${tablePrefix}workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
				`CONSTRAINT "FK_${tablePrefix}7ce200a20ade7ae89fa7901da896993f" FOREIGN KEY ("credentialId") REFERENCES "${tablePrefix}credentials_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION ` +
				');',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE "${tablePrefix}credential_usage"`);
	}
}
