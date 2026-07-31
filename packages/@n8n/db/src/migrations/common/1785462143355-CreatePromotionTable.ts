import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreatePromotionTable1785462143355 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('promotion').withColumns(
			column('id').varchar(36).primary,
			column('model')
				.varchar(64)
				.notNull.comment(
					'Promotion model that owns this lifecycle (e.g. direct-push); models register at runtime, so no enum check',
				),
			column('role')
				.varchar(16)
				.notNull.withEnumCheck(['source', 'destination'])
				.comment('Role this instance plays in the promotion'),
			column('unitOfWorkType')
				.varchar(32)
				.notNull.comment('Kind of unit being promoted (e.g. project)'),
			column('unitOfWorkId')
				.varchar(36)
				.notNull.comment(
					'Id of the promoted unit on this instance; no FK because the target table depends on unitOfWorkType',
				),
			column('state')
				.varchar(64)
				.notNull.comment('Lifecycle state; the vocabulary is owned by the promotion model'),
			column('metadata').json.notNull.comment(
				'Model-specific data (peer instance ref, artifact refs, git branch, approvals)',
			),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('promotion');
	}
}
