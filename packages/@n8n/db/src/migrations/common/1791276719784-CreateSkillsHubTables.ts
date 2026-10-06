import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SKILL_TABLE = 'skill';
const SKILL_VERSION_TABLE = 'skill_version';
const SKILL_FILE_TABLE = 'skill_file';
const AGENT_SKILL_DEPENDENCY_TABLE = 'agent_skill_dependency';
const AGENT_HISTORY_SKILL_TABLE = 'agent_history_skill';

/**
 * The skills hub: skills live outside the agent row, so many agents can use one skill.
 * A skill belongs to one target: a user ("Just you"), a team project, or the instance
 * (neither set). Its name and content live in versions: the row with a NULL version is
 * the live draft; publish copies the draft into numbered, immutable versions and pins
 * them.
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
				column('userId').uuid.comment('Set for a "Just you" skill. NULL otherwise'),
				column('projectId').varchar(36).comment('Set for a team project skill. NULL otherwise'),
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
		schemaBuilder: { createTable, createIndex, column },
		escape,
	}: MigrationContext) {
		await createTable(SKILL_VERSION_TABLE)
			.withColumns(
				column('id').uuid.primary,
				column('skillId').varchar(36).notNull,
				column('version').int.comment(
					'NULL for the live draft. Publish creates 1..n, which never change',
				),
				column('name')
					.varchar(128)
					.notNull.comment(
						'Free-text skill name. The draft holds the current name, a saved version the published one',
					),
				column('description').varchar(1024).notNull,
				column('instructions').text.notNull,
				column('frontmatter').json.comment(
					'SKILL.md frontmatter fields other than name and description, e.g. allowed-tools',
				),
				column('contentHash')
					.varchar(64)
					.notNull.comment(
						'sha256 of name, description, instructions, frontmatter and files. Publish reuses a saved version with the same hash',
					),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withUniqueConstraintOn(['skillId', 'version'])
			.withIndexOn(['skillId', 'contentHash'])
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

		// One draft per skill. The unique (skillId, version) constraint does not cover
		// it, because NULL versions are distinct there.
		await createIndex(
			SKILL_VERSION_TABLE,
			['skillId'],
			true,
			undefined,
			`${escape.columnName('version')} IS NULL`,
		);
	}

	private async createSkillFileTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(SKILL_FILE_TABLE)
			.withColumns(
				column('skillVersionId').uuid.primary,
				column('path').varchar(512).primary.comment('Relative path, references/*.md in v1'),
				column('position').int.notNull.comment('Order of the file in the skill, from 0'),
				column('content').text.notNull,
				column('sizeBytes').int.notNull.comment('UTF-8 byte length of content'),
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
				// A draft normally follows the skill's live draft row. An agent revert pins
				// the draft to the saved version it had; the pin clears on the next edit.
				column('skillVersionId').uuid.comment(
					'Set when the draft pins a saved version. NULL = follows the draft row',
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
				column('skillRefId')
					.varchar(36)
					.primary.comment('The ref id as written in that agent_history row schema'),
				column('skillVersionId').uuid.notNull,
			)
			.withCreatedAt.withIndexOn(['skillVersionId'])
			.withForeignKey('agentVersionId', {
				tableName: 'agent_history',
				columnName: 'versionId',
				onDelete: 'CASCADE',
			})
			// NO ACTION, not RESTRICT: the check runs at the end of the statement, so a
			// user or project delete can remove its skills together with the agents that
			// pin them. The service refuses to delete a pinned skill on its own.
			.withForeignKey('skillVersionId', {
				tableName: SKILL_VERSION_TABLE,
				columnName: 'id',
				onDelete: 'NO ACTION',
			});
	}
}
