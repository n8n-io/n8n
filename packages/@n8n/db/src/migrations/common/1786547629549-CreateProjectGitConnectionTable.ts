import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateProjectGitConnectionTable1786547629549 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('project_git_connection').withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(128).notNull,
			column('repositoryUrl').text.notNull,
			column('branchName').varchar(255),
			column('connectionType')
				.varchar(16)
				.notNull.withEnumCheck(['ssh', 'https'])
				.comment('GitConnectionType enum: "ssh", "https"'),
			column('connected').bool.notNull.default(false),
			column('publicKey').text,
			column('encryptedPrivateKey').text,
			column('encryptedUsername').text,
			column('encryptedPassword').text,
			column('keyGeneratorType')
				.varchar(16)
				.withEnumCheck(['ed25519', 'rsa'])
				.comment('GitKeyGeneratorType enum: "ed25519", "rsa"'),
			column('baseCommit').varchar(64),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('project_git_connection');
	}
}
