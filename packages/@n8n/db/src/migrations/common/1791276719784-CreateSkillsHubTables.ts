import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SKILL_TABLE = 'skill';
const SKILL_VERSION_TABLE = 'skill_version';
const SKILL_FILE_TABLE = 'skill_file';
const AGENT_SKILL_DEPENDENCY_TABLE = 'agent_skill_dependency';
const AGENT_HISTORY_SKILL_TABLE = 'agent_history_skill';

/**
 * The skills hub: skills live outside the agent row, so many agents can use one skill.
 * A skill belongs to one target: a user ("Just you", for the assistant only), a project
 * (team or personal, for its agents and its assistant sessions), or the instance (neither
 * set). Its name and content live in numbered, immutable versions: every Save creates
 * the next one, agents read the latest, and agent publishes pin the one they ran. There
 * is no draft row; an editor keeps unsaved changes to itself until Save.
 */
export class CreateSkillsHubTables1791276719784 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createSkillTable(context);
		await this.createSkillVersionTable(context);
		await this.createSkillFileTable(context);
		await this.createAgentSkillDependencyTable(context);
		await this.createAgentHistorySkillTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(AGENT_HISTORY_SKILL_TABLE);
		await dropTable(AGENT_SKILL_DEPENDENCY_TABLE);
		await dropTable(SKILL_FILE_TABLE);
		await dropTable(SKILL_VERSION_TABLE);
		await dropTable(SKILL_TABLE);
	}

	private async createSkillTable({
		schemaBuilder: { createTable, column },
		tablePrefix,
		escape,
	}: MigrationContext) {
		// The id is the identity. Names live on skill_version and may repeat.
		await createTable(SKILL_TABLE)
			.withColumns(
				column('id').varchar(36).primary.comment('skill_<nanoid>, the same format agents use'),
				column('userId').uuid.comment(
					'Set for a "Just you" skill, which agents never use. NULL otherwise',
				),
				column('projectId')
					.varchar(36)
					.comment('Set for a project skill, team or personal. NULL otherwise'),
				column('source')
					.varchar(16)
					.notNull.withEnumCheck(['ui', 'upload', 'agent'])
					.comment('How the skill was created: "ui", "upload", or "agent"'),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn(['userId'])
			.withIndexOn(['projectId'])
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withCheck(
				`CHK_${tablePrefix}skill_single_target`,
				`${escape.columnName('userId')} IS NULL OR ${escape.columnName('projectId')} IS NULL`,
			);
	}

	private async createSkillVersionTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(SKILL_VERSION_TABLE)
			.withColumns(
				column('id').uuid.primary,
				column('skillId').varchar(36).notNull,
				column('version').int.notNull.comment(
					'1..n per skill. Each Save adds one; none ever changes',
				),
				column('name')
					.varchar(128)
					.notNull.comment('Free-text skill name, as it was when this version was saved'),
				column('description').varchar(1024).notNull,
				column('instructions').text.notNull,
				column('frontmatter').json.comment(
					'SKILL.md frontmatter fields other than name and description, e.g. allowed-tools',
				),
				column('contentHash')
					.varchar(64)
					.notNull.comment(
						'sha256 of name, description, instructions, frontmatter and files. Save creates no version when the content matches the latest one',
					),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withUniqueConstraintOn(['skillId', 'version'])
			.withForeignKey('skillId', {
				tableName: SKILL_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	private async createSkillFileTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(SKILL_FILE_TABLE)
			.withColumns(
				column('skillVersionId').uuid.primary,
				column('path').varchar(512).primary.comment('Relative path, references/*.md in v1'),
				column('content').text.notNull,
			)
			.withTimestamps.withForeignKey('skillVersionId', {
				tableName: SKILL_VERSION_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createAgentSkillDependencyTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(AGENT_SKILL_DEPENDENCY_TABLE)
			.withColumns(
				column('agentId').varchar(36).primary,
				column('skillId').varchar(36).primary,
				// A draft normally follows the skill's latest saved version. An agent revert
				// pins the version it had; the pin clears when the skill is saved again.
				column('skillVersionId').uuid.comment(
					'Set when the agent draft pins a saved version. NULL = follows the latest saved version',
				),
			)
			.withCreatedAt.withIndexOn(['skillId'])
			.withIndexOn(['skillVersionId'])
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('skillId', { tableName: SKILL_TABLE, columnName: 'id', onDelete: 'CASCADE' })
			// NO ACTION for the same reason as agent_history_skill: a user or project
			// delete removes the skill together with the agents that pin it.
			.withForeignKey('skillVersionId', {
				tableName: SKILL_VERSION_TABLE,
				columnName: 'id',
				onDelete: 'NO ACTION',
			});
	}

	private async createAgentHistorySkillTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(AGENT_HISTORY_SKILL_TABLE)
			.withColumns(
				column('agentVersionId').varchar(36).primary,
				column('skillId').varchar(36).primary,
				column('skillVersionId').uuid.notNull,
			)
			.withCreatedAt.withIndexOn(['skillId'])
			.withIndexOn(['skillVersionId'])
			.withForeignKey('agentVersionId', {
				tableName: 'agent_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			})
			// NO ACTION, not RESTRICT: the check runs at the end of the statement, so a
			// user or project delete can remove its skills together with the agents that
			// pin them. The service refuses to delete a pinned skill on its own.
			.withForeignKey('skillId', {
				tableName: SKILL_TABLE,
				columnName: 'id',
				onDelete: 'NO ACTION',
			})
			.withForeignKey('skillVersionId', {
				tableName: SKILL_VERSION_TABLE,
				columnName: 'id',
				onDelete: 'NO ACTION',
			});
	}
}
