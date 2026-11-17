import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'promotion_owner_request';

// Inlined on purpose: a migration must not import live enums from other packages.
const directions = ['promote', 'apply'];
const resourceKinds = ['credential', 'workflow'];
const states = ['open', 'closed'];
const closeReasons = ['dismissed', 'satisfied'];

/**
 * A request to the owner of a resource: a user who cannot promote or apply the project of a
 * dependency asks the owner project to do it. The row keeps the operation and the environment.
 */
export class CreatePromotionOwnerRequestTable1794948393402 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column, createIndex },
		tablePrefix,
		escape,
	}: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('id').uuid.primary,
				column('environmentId').uuid.notNull.comment(
					'The promotion environment of the operation that the requester ran.',
				),
				column('direction')
					.varchar(16)
					.notNull.withEnumCheck(directions)
					.comment(
						'PromotionDirection enum: "promote", "apply". Copied from the environment. The request offers this operation to the owner.',
					),
				column('resourceKind')
					.varchar(16)
					.notNull.withEnumCheck(resourceKinds)
					.comment('The kind of the requested resource: "credential", "workflow".'),
				column('resourceId').varchar(36).notNull.comment('The id of the requested resource.'),
				column('resourceName').varchar(255).notNull,
				column('credentialType')
					.varchar(255)
					.comment(
						'The credential type that the node of the requester holds. NULL for a workflow.',
					),
				column('ownerProjectId')
					.varchar(36)
					.comment(
						'The project that owns the resource. NULL when the project is not on this instance: the instance admins receive the request.',
					),
				column('requesterId').uuid.notNull.comment('The user who asked.'),
				column('consumerWorkflowId')
					.varchar(36)
					.notNull.comment(
						'The workflow of the requester that references the resource. Not shown to a recipient.',
					),
				column('state')
					.varchar(16)
					.notNull.default("'open'")
					.withEnumCheck(states)
					.comment('"open" or "closed". A closed request never opens again.'),
				column('closeReason')
					.varchar(16)
					.withEnumCheck(closeReasons)
					.comment(
						'"dismissed": a recipient closed it. "satisfied": the resource reached the branch or the destination. NULL while open.',
					),
			)
			.withTimestamps.withForeignKey('environmentId', {
				tableName: 'promotion_environment',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_owner_request_environmentId`,
			})
			.withForeignKey('ownerProjectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_owner_request_ownerProjectId`,
			})
			.withForeignKey('requesterId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_owner_request_requesterId`,
			})
			// The inbox lists by state and orders by the latest activity.
			.withIndexOn(['state', 'updatedAt'])
			// Foreign key indexes, for the cascade deletes.
			.withIndexOn(['environmentId'])
			.withIndexOn(['ownerProjectId']);

		// One open request for each requester, resource, operation and environment.
		await createIndex(
			table,
			['requesterId', 'environmentId', 'direction', 'resourceKind', 'resourceId'],
			true,
			undefined,
			`${escape.columnName('state')} = 'open'`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
