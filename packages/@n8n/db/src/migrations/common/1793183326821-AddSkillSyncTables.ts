import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SOURCE_TABLE = 'skill_source';
const LINK_TABLE = 'skill_source_link';
const SKILL_VERSION_TABLE = 'skill_version';

/**
 * Skill Sync: a source is one remote location (a GitHub repository now) in one scope, and a
 * link makes one skill a synced skill of that source. A pending update waits on the link, so
 * the editor, MCP and the runtime never read content that nobody reviewed.
 */
export class AddSkillSyncTables1793092784587 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createSourceTable(context);
		await this.createLinkTable(context);
		await this.addSourceRevisionToSkillVersion(context);
	}

	async down({ schemaBuilder: { dropTable }, runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName(SKILL_VERSION_TABLE)} DROP COLUMN ${escape.columnName('sourceRevision')}`,
		);
		await dropTable(LINK_TABLE);
		await dropTable(SOURCE_TABLE);
	}

	private async createSourceTable({
		schemaBuilder: { createTable, column, createIndex },
		escape,
	}: MigrationContext) {
		await createTable(SOURCE_TABLE)
			.withColumns(
				column('id').uuid.primary.comment('UUIDv7, made by the application'),
				// No CHECK: GitLab and Notion add values later.
				column('type')
					.varchar(16)
					.notNull.comment('Source type, "github". Selects the client'),
				column('locator').json.notNull.comment(
					'Where the skills are, as the client parsed it from the link. Opaque to the core',
				),
				column('identityKey')
					.varchar(255)
					.notNull.comment(
						'Source type, host, owner and repository in lower case, e.g. "github:github.com/acme/skills". The duplicate rules compare it',
					),
				column('projectId')
					.varchar(36)
					.comment('The scope: a team or personal project. NULL = Global'),
				column('credentialId')
					.varchar(36)
					.comment('Credential that reads a private source. NULL = public access'),
				column('status')
					.varchar(32)
					.notNull.default("'connected'")
					.withEnumCheck(['connected', 'credential_expired', 'unreachable', 'delayed'])
					.comment('Health of the source, set by the last check'),
				column('probeCursor').text.comment(
					'Opaque value of the last change probe, e.g. a commit SHA. NULL before the first check',
				),
				column('lastCheckedAt')
					.timestampTimezone()
					.comment('End of the last check. NULL before the first check'),
				// No CHECK: the reason codes grow with each feature.
				column('lastErrorReason')
					.varchar(32)
					.comment(
						'Reason code of the last failed check, e.g. "rate_limited". NULL after a success',
					),
				column('createdById').uuid.comment(
					'Creator. The check task reads the feature flag of this user. NULL after the user is deleted',
				),
			)
			.withTimestamps.withIndexOn(['projectId'])
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' })
			// The source stays without a credential, and the next check reports it.
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('createdById', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });

		// One source for each repository in each scope. A plain unique index does not hold for
		// Global, because Postgres and SQLite treat each NULL projectId as a different value.
		const projectId = escape.columnName('projectId');
		await createIndex(
			SOURCE_TABLE,
			['identityKey', 'projectId'],
			true,
			undefined,
			`${projectId} IS NOT NULL`,
		);
		await createIndex(SOURCE_TABLE, ['identityKey'], true, undefined, `${projectId} IS NULL`);
	}

	private async createLinkTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(LINK_TABLE)
			.withColumns(
				column('skillId').varchar(36).primary.comment('The synced skill. One link for each skill'),
				column('sourceId').uuid.notNull.comment('The source that syncs the skill'),
				column('remoteRef').json.notNull.comment(
					'Where the skill is in the source, e.g. its folder. Opaque to the core',
				),
				column('baseRevision')
					.varchar(255)
					.notNull.comment('Source revision of the content in the latest accepted version'),
				column('baseContentHash')
					.varchar(64)
					.notNull.comment('skillContentHash of the latest accepted content'),
				column('pendingContent').json.comment(
					'Skill content of the update that waits for review. NULL when no update waits',
				),
				column('pendingContentHash')
					.varchar(64)
					.comment('skillContentHash of pendingContent. Accept refuses a review of other content'),
				column('pendingScan').json.comment(
					'Security check result of pendingContent: verdict and rule codes',
				),
				column('pendingRevision').varchar(255).comment('Source revision of pendingContent'),
				column('skippedContentHash')
					.varchar(64)
					.comment('Content hash that the user skipped. A check hides an update with this hash'),
				column('state')
					.varchar(32)
					.notNull.default("'up_to_date'")
					.withEnumCheck(['up_to_date', 'update_available', 'update_blocked', 'source_unavailable'])
					.comment('Sync state that badges and counts read'),
				column('skippedFiles').json.notNull.comment(
					'Paths of the files that the import left out, e.g. scripts',
				),
			)
			.withTimestamps.withIndexOn(['sourceId'])
			// A skill delete removes its link. The source stays.
			.withForeignKey('skillId', { tableName: 'skill', columnName: 'id', onDelete: 'CASCADE' })
			// Disconnect deletes the source and its links. The skills stay.
			.withForeignKey('sourceId', {
				tableName: SOURCE_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	// Raw ALTER TABLE: the DSL addColumns recreates the table on SQLite, and other tables have
	// foreign keys to skill_version.
	private async addSourceRevisionToSkillVersion({
		runQuery,
		escape,
		isPostgres,
	}: MigrationContext) {
		const table = escape.tableName(SKILL_VERSION_TABLE);
		const column = escape.columnName('sourceRevision');
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} varchar(255)`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'Source revision that this version came from, set by Skill Sync. NULL for a version made in n8n'`,
			);
		}
	}
}
