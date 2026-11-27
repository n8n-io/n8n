import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'promotion_credential_draft';

/**
 * Prototype. Values that a user added for a branch credential that this instance lacks. Apply
 * creates the credential from the branch and these values. The values are encrypted.
 */
export class CreatePromotionCredentialDraftTable1795778318405 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('projectId')
					.varchar(36)
					.primary.notNull.comment('The project that owns the credential on the branch.'),
				column('sourceCredentialId')
					.varchar(36)
					.primary.notNull.comment(
						'The id of the credential on the branch. Apply creates it with this id.',
					),
				column('name').varchar(128).notNull.comment('The credential name that the user entered.'),
				column('data').text.notNull.comment('The values that the user entered, encrypted.'),
				column('updatedById').uuid.comment(
					'The user who saved the draft last. NULL after that user is deleted.',
				),
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_credential_draft_projectId`,
			})
			.withForeignKey('updatedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_credential_draft_updatedById`,
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
