import type { MigrationContext, ReversibleMigration } from '../migration-types';

const LINK_TABLE = 'skill_git_link';
const UPDATE_TABLE = 'skill_git_update';

/**
 * Skills that n8n reads from a public GitHub repository. `skill_git_link` holds the
 * folder a skill comes from and what n8n last read there. `skill_git_update` holds new
 * content from GitHub that waits for a person to accept or skip it, so content that no
 * one accepted never reaches a skill version. `skill_version.sourceCommitSha` records the
 * commit each version came from.
 */
export class CreateSkillGitSyncTables1792361567149 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { createTable, column },
			escape,
			runQuery,
		} = context;

		await createTable(LINK_TABLE)
			.withColumns(
				column('skillId').varchar(36).primary,
				column('owner').varchar(100).notNull,
				column('repo').varchar(100).notNull,
				column('ref')
					.varchar(255)
					.notNull.comment('The branch, tag or commit SHA from the link the user pasted'),
				column('refType')
					.varchar(16)
					.notNull.comment('"branch" gets updates. "tag" and "commit" are imported once'),
				column('path').varchar(512).notNull.comment('The folder of SKILL.md in the repository'),
				column('syncedCommitSha')
					.varchar(40)
					.notNull.comment('The commit of the latest version that came from GitHub'),
				column('seenCommitSha')
					.varchar(40)
					.notNull.comment('The newest commit n8n handled: imported, accepted, skipped or waiting'),
				column('seenTreeSha')
					.varchar(40)
					.comment('Git tree SHA of the folder at seenCommitSha. Unchanged = no update'),
				column('status')
					.varchar(16)
					.notNull.default("'ok'")
					.comment('"ok", "unavailable" or "rate_limited"'),
				column('lastError').varchar(512),
				column('lastCheckedAt').timestamp(),
			)
			.withTimestamps.withIndexOn(['owner', 'repo', 'ref'])
			.withForeignKey('skillId', { tableName: 'skill', columnName: 'id', onDelete: 'CASCADE' });

		await createTable(UPDATE_TABLE)
			.withColumns(
				column('skillId').varchar(36).primary.comment('One waiting update for each skill'),
				column('fromCommitSha').varchar(40).notNull,
				column('toCommitSha').varchar(40).notNull,
				column('commitMessage').varchar(1024),
				column('commitAuthor').varchar(255),
				column('committedAt').timestamp(),
				column('content').json.notNull.comment(
					'name, description, instructions, frontmatter, files',
				),
				column('contentHash').varchar(64).notNull,
				column('checkResult').json.notNull.comment(
					'Security check result and findings for this exact content',
				),
				column('skippedFiles').json.comment('Files in the folder that n8n does not import'),
				column('status').varchar(16).notNull.comment('"pending" or "blocked"'),
			)
			.withTimestamps.withForeignKey('skillId', {
				tableName: 'skill',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// A raw ALTER TABLE, as for `label`: the SQLite recreate of `addColumns` would hit the
		// tables that refer to `skill_version`.
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_version')} ADD COLUMN ${escape.columnName('sourceCommitSha')} VARCHAR(40)`,
		);
	}

	async down({ schemaBuilder: { dropTable }, escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_version')} DROP COLUMN ${escape.columnName('sourceCommitSha')}`,
		);
		await dropTable(UPDATE_TABLE);
		await dropTable(LINK_TABLE);
	}
}
