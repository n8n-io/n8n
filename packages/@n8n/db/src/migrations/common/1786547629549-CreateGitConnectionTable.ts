import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateGitConnectionTable1786547629549 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('git_connection').withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(128).notNull,
			column('repositoryUrl').text.notNull,
			column('branchName').varchar(255),
			column('connectionType')
				.varchar(16)
				.notNull.withEnumCheck(['ssh', 'https'])
				.comment('GitConnectionType enum: "ssh", "https"'),
			column('connected')
				.bool.notNull.default(false)
				.comment(
					'Whether the connection is currently connected to the remote; false while configured-only.',
				),
			column('publicKey').text.comment(
				"SSH public key; set when connectionType is 'ssh', null for 'https'.",
			),
			column('encryptedPrivateKey').text.comment(
				"Encrypted SSH private key; set when connectionType is 'ssh', null for 'https'.",
			),
			column('encryptedUsername').text.comment(
				"Encrypted HTTPS username; set when connectionType is 'https', null for 'ssh'.",
			),
			column('encryptedPassword').text.comment(
				"Encrypted HTTPS password/token; set when connectionType is 'https', null for 'ssh'.",
			),
			column('keyGeneratorType')
				.varchar(16)
				.withEnumCheck(['ed25519', 'rsa'])
				.comment('GitKeyGeneratorType enum: "ed25519", "rsa"'),
			column('baseCommit')
				.varchar(64)
				.comment(
					'Last commit successfully reconciled for this connection; the base for three-way reconciliation.',
				),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('git_connection');
	}
}
