import type { MigrationContext, ReversibleMigration } from '../migration-types';

const PREFERENCE_TABLE = 'preference';
const USER_TABLE = 'user';
const PROJECT_TABLE = 'project';

/**
 * Free-text instructions that the AI assistant and MCP server inject into their prompts.
 * A preference is global, personal to one user, or scoped to one project.
 */
export class CreatePreferenceTable1788882375989 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(PREFERENCE_TABLE)
			.withColumns(
				column('id').uuid.primary,
				column('scope')
					.varchar(16)
					.notNull.withEnumCheck(['global', 'personal', 'project'])
					.comment(
						'global: every user, every project. personal: one user, every project. project: every member of one project',
					),
				column('content').text.notNull.comment('Instruction text injected into AI prompts'),
				column('userId').uuid.comment('Set only when scope is personal'),
				column('projectId').varchar(36).comment('Set only when scope is project'),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn(['userId'])
			.withIndexOn(['projectId'])
			.withIndexOn(['createdById'])
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
				`CHK_${tablePrefix}preference_scope_target`,
				'("scope" = \'global\' AND "userId" IS NULL AND "projectId" IS NULL)' +
					' OR ("scope" = \'personal\' AND "userId" IS NOT NULL AND "projectId" IS NULL)' +
					' OR ("scope" = \'project\' AND "userId" IS NULL AND "projectId" IS NOT NULL)',
			);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(PREFERENCE_TABLE);
	}
}
