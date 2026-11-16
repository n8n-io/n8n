import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AI_PREFERENCE_TABLE = 'ai_preference';
const USER_TABLE = 'user';
const PROJECT_TABLE = 'project';

/**
 * Free-text instructions that the AI assistant and MCP server inject into their prompts.
 * `userId` set: personal to one user. `projectId` set: shared by one project. Neither: global.
 */
export class CreateAiPreferenceTable1788882375989 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(AI_PREFERENCE_TABLE)
			.withColumns(
				column('id').uuid.primary,
				column('content').text.notNull.comment('Instruction text injected into AI prompts'),
				column('userId').uuid.comment('Set for a personal preference. NULL otherwise'),
				column('projectId').varchar(36).comment('Set for a project preference. NULL otherwise'),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn(['userId'])
			.withIndexOn(['projectId'])
			.withForeignKey('userId', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withCheck(
				`CHK_${tablePrefix}ai_preference_single_target`,
				'"userId" IS NULL OR "projectId" IS NULL',
			);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(AI_PREFERENCE_TABLE);
	}
}
