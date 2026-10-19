import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SKILL_TABLE = 'skill';
const SKILL_VERSION_TABLE = 'skill_version';
const SKILL_FILE_TABLE = 'skill_file';
const AGENT_SKILL_DEPENDENCY_TABLE = 'agent_skill_dependency';
const AGENT_VERSION_SKILL_DEPENDENCY_TABLE = 'agent_version_skill_dependency';

/**
 * The skills hub: skills live outside the agent row, so many agents can use one skill.
 * A skill belongs to one target: a project (team or personal, for its agents), one agent
 * (only that agent can use it; its project is the agent's), or the instance (neither set). Its name and
 * content live in numbered, immutable versions: a Save that changes the content creates
 * the next one, agents read the latest, and agent publishes pin the one they ran.
 */
export class CreateSkillsHubTables1791818723687 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createSkillTable(context);
		await this.createSkillVersionTable(context);
		await this.createSkillFileTable(context);
		await this.createAgentSkillDependencyTable(context);
		await this.createAgentVersionSkillDependencyTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(AGENT_VERSION_SKILL_DEPENDENCY_TABLE);
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
				column('projectId')
					.varchar(36)
					.comment('Set for a project skill, team or personal. NULL otherwise'),
				column('agentId')
					.varchar(36)
					.comment(
						'Set when only this agent can use the skill. projectId is then NULL: the agent holds the project',
					),
				// No CHECK on the values: new sources (upload, Git sync, AI-written) must not
				// recreate the table on SQLite. The service validates them.
				column('source')
					.varchar(16)
					.notNull.comment(
						'How the skill was created, set by the server: "ui" (the skills hub) or "agent" (the agent builder or the copy of agent skills)',
					),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn(['projectId'])
			.withIndexOn(['agentId'])
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			// An agent skill goes with its agent, as agent skills do today.
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			// One target. An agent skill takes its project from the agent, so the two cannot
			// disagree, and the skill follows the agent if the agent moves.
			.withCheck(
				`CHK_${tablePrefix}skill_single_target`,
				`${escape.columnName('agentId')} IS NULL OR ${escape.columnName('projectId')} IS NULL`,
			);
	}

	private async createSkillVersionTable({
		schemaBuilder: { createTable, column },
		tablePrefix,
		escape,
	}: MigrationContext) {
		await createTable(SKILL_VERSION_TABLE)
			.withColumns(
				column('id').uuid.primary,
				column('skillId').varchar(36).notNull,
				column('version').int.notNull.comment(
					'1..n per skill. A Save that changes the content adds one; none ever changes',
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
			.withCheck(`CHK_${tablePrefix}skill_version_version`, `${escape.columnName('version')} > 0`)
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
				// An agent draft normally follows the skill's latest saved version. A revert
				// pins the version it had; the pin clears when the skill is saved again.
				column('skillVersionId').uuid.comment(
					'Set when the agent draft pins a saved version. NULL = follows the latest saved version',
				),
			)
			.withCreatedAt.withIndexOn(['skillId'])
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('skillId', { tableName: SKILL_TABLE, columnName: 'id', onDelete: 'CASCADE' })
			// NO ACTION keeps a pinned version from being deleted on its own. A skill delete
			// removes these rows first, through the skillId cascade.
			.withForeignKey('skillVersionId', {
				tableName: SKILL_VERSION_TABLE,
				columnName: 'id',
				onDelete: 'NO ACTION',
			});
	}

	private async createAgentVersionSkillDependencyTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(AGENT_VERSION_SKILL_DEPENDENCY_TABLE)
			.withColumns(
				column('agentVersionId').varchar(36).primary,
				column('skillId').varchar(36).primary,
				column('skillVersionId').uuid.notNull,
			)
			.withCreatedAt.withIndexOn(['skillId'])
			// This table grows with every publish, and "used by" reads it by version.
			.withIndexOn(['skillVersionId'])
			.withForeignKey('agentVersionId', {
				tableName: 'agent_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			})
			// CASCADE, as in agent_skill_dependency: a user or project delete removes a skill
			// and the agents that pin it, and Postgres checks NO ACTION before the agent
			// cascade runs. The service refuses to delete a skill that is in use.
			.withForeignKey('skillId', {
				tableName: SKILL_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			// NO ACTION keeps a pinned version from being deleted on its own.
			.withForeignKey('skillVersionId', {
				tableName: SKILL_VERSION_TABLE,
				columnName: 'id',
				onDelete: 'NO ACTION',
			});
	}
}
