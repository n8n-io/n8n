import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'activity_event';
const USER_TABLE = 'user';
const PROJECT_TABLE = 'project';

/**
 * Append-only feed of recent instance activity, written from the event bus and read as context for
 * the instance agent. Entries are pointers to resources rather than copies of them.
 */
export class CreateActivityEventTable1788253087010 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column }, tablePrefix }: MigrationContext) {
		await createTable(ACTIVITY_TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				// No CHECK on either vocabulary: `workflow_review_activity` shipped one on its
				// equivalent column and had to drop it again, because a feed covers more kinds with
				// every feature and each widening is another SQLite table recreation. The single
				// writer is a typed relay, so the compiler rejects a value outside the union.
				column('category')
					.varchar(32)
					.notNull.comment(
						'Kind of happening, not kind of resource — see ActivityEventCategory in @n8n/db. ' +
							'The unit a reader caps and collapses by: workflow, credential. Executions are ' +
							'absent on purpose; execution_entity already records and indexes them',
					),
				column('action')
					.varchar(64)
					.notNull.comment(
						'What happened, as a verb: created, saved, published, unpublished, deleted, ' +
							'archived, unarchived, version-updated',
					),
				column('typeVersion')
					.int.notNull.default(1)
					.comment('Schema version of `data` for this category/action pair'),
				column('userId').uuid.comment(
					'Who acted. Never NULL on insert — every event carries a user. Goes NULL when ' +
						'that user is deleted',
				),
				column('projectId')
					.varchar(36)
					.notNull.comment(
						'The access boundary; every read filters on it, so an entry without a project ' +
							'could never be shown and is not worth writing',
					),
				column('resourceType')
					.varchar(32)
					.comment(
						'What `resourceId` points at; see ActivityResourceType in @n8n/db. NULL when an ' +
							'entry is about the instance rather than a resource',
					),
				// Deliberately no foreign key, unlike every other reference in this schema: an entry
				// has to outlive what it describes, and a workflow deletion is the entry most worth
				// keeping. The same mistake was made and undone on
				// `workflow_review_activity.workflowId`, where a CASCADE meant a `workflow.deleted`
				// entry deleted itself. Readers treat every pointer as possibly dangling.
				column('resourceId')
					.varchar(36)
					.comment('Id of the resource, for fetching the full record. No FK: entries outlive it'),
				column('resourceName').text.comment(
					'Name at the time of the entry, denormalised so a row reads without a join and ' +
						'survives the resource being deleted. Truncated on write',
				),
				column('data').json.comment(
					'Minimal detail that makes an entry meaningful unexpanded (a save node delta, and ' +
						'whether the assistant or the user changed it). Size-capped on write; no user ids',
				),
			)
			.withCreatedAt.withForeignKey('userId', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			// CASCADE: a deleted project's history is unreachable by every read, since all of them
			// are project-scoped. Recording the deletion itself would need an entry outside the
			// project, which no writer emits today.
			.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// The feed read: newest entries for one project, keyset paginated on id. Leading column
		// also serves the project FK cascade.
		await createIndex(
			ACTIVITY_TABLE,
			['projectId', 'id'],
			false,
			`IDX_${tablePrefix}activity_event_project`,
		);
		// "What did I do", and the lookup the user FK needs to null these on user deletion.
		await createIndex(
			ACTIVITY_TABLE,
			['userId', 'id'],
			false,
			`IDX_${tablePrefix}activity_event_user`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(ACTIVITY_TABLE);
	}
}
