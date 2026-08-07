import type { MigrationContext, ReversibleMigration } from '../migration-types';

const CONNECTION_TABLE = 'source_control_connection';
const SCOPE_TABLE = 'source_control_scope';
const PROJECT_TABLE = 'project';

const UQ_CONNECTION_REPO_BRANCH = 'source_control_connection_repo_branch';
const UQ_SCOPE_PROJECT = 'source_control_scope_project';

export class CreateSourceControlConnectionTables1786000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, runQuery, escape }: MigrationContext) {
		await createTable(CONNECTION_TABLE).withColumns(
			column('id').varchar(36).primary,
			column('repositoryUrl').text.notNull,
			column('branchName').varchar(255).notNull.default("'main'"),
			column('branchReadOnly').bool.notNull.default(false),
			column('branchColor').varchar(16).notNull.default("'#5296D6'"),
			column('connectionType').varchar(16).notNull.withEnumCheck(['ssh', 'https']),
			column('connected').bool.notNull.default(false),
			column('publicKey').text,
			column('encryptedPrivateKey').text,
			column('encryptedUsername').text,
			column('encryptedPassword').text,
		).withTimestamps;

		await createTable(SCOPE_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('connectionId').varchar(36).notNull,
				column('scopeType').varchar(16).notNull.withEnumCheck(['project', 'instance']),
				column('projectId').varchar(36),
			)
			.withTimestamps.withForeignKey('connectionId', {
				tableName: CONNECTION_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		const connectionTable = escape.tableName(CONNECTION_TABLE);
		const scopeTable = escape.tableName(SCOPE_TABLE);
		// repositoryUrl is text; index its column pair via an expression-safe varchar cast is
		// unnecessary here — both sqlite and postgres index text columns directly.
		await runQuery(
			`CREATE UNIQUE INDEX IF NOT EXISTS ${escape.indexName(UQ_CONNECTION_REPO_BRANCH)}
			ON ${connectionTable}(${escape.columnName('repositoryUrl')}, ${escape.columnName('branchName')})`,
		);
		// NULL projectIds (instance scopes) are distinct in both sqlite and postgres,
		// so this enforces "a project is claimed by at most one connection" only.
		await runQuery(
			`CREATE UNIQUE INDEX IF NOT EXISTS ${escape.indexName(UQ_SCOPE_PROJECT)}
			ON ${scopeTable}(${escape.columnName('projectId')})`,
		);
	}

	async down({ schemaBuilder: { dropTable }, runQuery, escape }: MigrationContext) {
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(UQ_SCOPE_PROJECT)}`);
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(UQ_CONNECTION_REPO_BRANCH)}`);
		await dropTable(SCOPE_TABLE);
		await dropTable(CONNECTION_TABLE);
	}
}
