import type { MigrationContext, ReversibleMigration } from '../migration-types';

const POLICY_TABLE = 'type_availability_policy';
const SCOPE_TABLE = 'type_availability_policy_scope';
const ATTACHMENT_TABLE = 'type_availability_policy_attachment';
const PROJECT_TABLE = 'project';

/** The three actions a rule or a scope default may take. */
const ACTIONS = ['allow', 'deny', 'delegate'];

/**
 * Storage for type availability policies: a reusable rules document
 * (`type_availability_policy`), what a scope owns (`…_scope`), and the ordered link
 * between them (`…_attachment`).
 *
 * Scoped to type availability rather than to policies at large, because the columns encode
 * one rule model — a selector list resolved first-match to allow/deny/delegate. Policy
 * features with a different model (quotas, egress) need their own tables, not these.
 * Within this model `kind` distinguishes the type family, so credential-type policies join
 * the same tables without a migration.
 */
export class CreateTypeAvailabilityPolicyTables1787841960965 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column }, tablePrefix }: MigrationContext) {
		// A policy is scope-free and attachable to any number of scopes. `version`
		// increments on content changes only, and drives optimistic concurrency,
		// cache keys, and the audit trail.
		await createTable(POLICY_TABLE).withColumns(
			column('id').varchar(36).primary,
			column('kind').varchar(64).notNull,
			column('rules').json.notNull,
			column('version').int.notNull.default(1),
			// Either a user id or the literal 'environment' for env-bootstrap
			// writes, so this deliberately has no FK to `user`.
			column('updatedBy').varchar(36).notNull,
		).withTimestamps;

		// What one scope owns: nothing but its own default action. Whether a row is the
		// instance scope is derived — `projectId IS NULL` — rather than stored, so there
		// is no instance-vs-project flag that could disagree with `projectId`.
		await createTable(SCOPE_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('kind').varchar(64).notNull,
				column('projectId').varchar(36),
				column('defaultAction').varchar(16).notNull.withEnumCheck(ACTIONS),
				// Also bumped when an attachment changes, so it stays a single
				// freshness signal for the scope's *effective* policy.
				column('version').int.notNull.default(1),
				column('updatedBy').varchar(36).notNull,
			)
			.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// NULLs are distinct in unique constraints on both Postgres and SQLite, so a
		// plain UNIQUE(kind, projectId) would admit any number of instance rows. Two
		// partial indexes split the nullable and non-nullable halves instead.
		await createIndex(
			SCOPE_TABLE,
			['kind', 'projectId'],
			true,
			`${tablePrefix}uq_type_availability_policy_scope_project`,
			'"projectId" IS NOT NULL',
		);
		await createIndex(
			SCOPE_TABLE,
			['kind'],
			true,
			`${tablePrefix}uq_type_availability_policy_scope_instance`,
			'"projectId" IS NULL',
		);

		// `(scopeId, policyId)` is the primary key: a policy attaches to a scope at
		// most once, and the pair is the only candidate key the table has.
		//
		// The policy side is RESTRICT, not CASCADE: cascading would drop attachments
		// without bumping the scope's version, leaving caches serving a policy that no
		// longer exists. Callers detach first; the FK is the backstop.
		await createTable(ATTACHMENT_TABLE)
			.withColumns(
				column('scopeId').varchar(36).primary,
				column('policyId').varchar(36).primary,
				column('priority').int.notNull,
				column('isFloor').bool.notNull.default(false),
			)
			.withForeignKey('scopeId', {
				tableName: SCOPE_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('policyId', {
				tableName: POLICY_TABLE,
				columnName: 'id',
				onDelete: 'RESTRICT',
			})
			// Reverse index: every scope a policy is attached to, for the version
			// bump that fans out when the policy's own content changes.
			.withIndexOn(['policyId']).withTimestamps;

		// Priority ties inside one partition are rejected at write time rather than
		// broken arbitrarily at evaluation time. Floor and normal are separate
		// partitions, so the same priority in each is fine.
		await createIndex(
			ATTACHMENT_TABLE,
			['scopeId', 'isFloor', 'priority'],
			true,
			`${tablePrefix}uq_type_availability_attachment_slot`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(ATTACHMENT_TABLE);
		await dropTable(SCOPE_TABLE);
		await dropTable(POLICY_TABLE);
	}
}
