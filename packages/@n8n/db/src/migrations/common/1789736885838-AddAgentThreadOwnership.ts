import type { MigrationContext, ReversibleMigration } from '../migration-types';

const previewSources = ['chat', 'n8n_chat', 'preview', 'mcp', 'instance-ai'];
const projectSources = ['slack', 'telegram', 'discord', 'linear', 'task', 'schedule', 'workflow'];

export class AddAgentThreadOwnership1789736885838 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { addColumns, column, addForeignKey, createIndex },
		} = context;
		await addColumns(
			'agent_execution_threads',
			[
				column('ownerId').uuid.comment('User who started this private session'),
				column('accessScope')
					.varchar(16)
					.notNull.default("'user'")
					.withEnumCheck(['user', 'project'])
					.comment('user: private session; project: shared integration, workflow, or task session'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_execution_threads',
			'ownerId',
			['user', 'id'],
			'FK_agent_execution_threads_owner',
			'SET NULL',
		);
		await createIndex('agent_execution_threads', ['ownerId']);
		await this.backfill(context);
		await this.backfillInheritedAccess(context);
	}

	async down({
		schemaBuilder: { dropForeignKey, dropIndex, dropColumns, dropEnumCheck },
	}: MigrationContext) {
		await dropForeignKey(
			'agent_execution_threads',
			'ownerId',
			['user', 'id'],
			'FK_agent_execution_threads_owner',
		);
		await dropIndex('agent_execution_threads', ['ownerId']);
		await dropEnumCheck('agent_execution_threads', 'accessScope', { recreatesOnSqlite: true });
		await dropColumns('agent_execution_threads', ['ownerId', 'accessScope'], {
			recreatesOnSqlite: true,
		});
	}

	private async backfill({ escape, runQuery }: MigrationContext) {
		const c = escape.columnName;
		const threads = escape.tableName('agent_execution_threads');
		const executions = escape.tableName('agent_execution');
		const memory = escape.tableName('agents_threads');
		const users = escape.tableName('user');
		const threadId = `${threads}.${c('id')}`;
		const agentId = `${threads}.${c('agentId')}`;
		const legacyPrefix = `'test-' || CAST(${agentId} AS TEXT) || ':'`;
		const hasPreviewMemory = `EXISTS (
			SELECT 1 FROM ${memory} m
			WHERE m.${c('id')} = ${threadId} AND m.${c('resourceId')} LIKE 'draft-chat:%'
		)`;
		const hasPreviewExecution = `EXISTS (
			SELECT 1 FROM ${executions} e
			WHERE e.${c('threadId')} = ${threadId}
			AND LOWER(TRIM(e.${c('source')})) IN (:...previewSources)
		)`;
		const hasProjectExecution = `EXISTS (
			SELECT 1 FROM ${executions} e
			WHERE e.${c('threadId')} = ${threadId}
			AND LOWER(TRIM(e.${c('source')})) IN (:...projectSources)
		)`;
		const hasProjectMemory = `EXISTS (
			SELECT 1 FROM ${memory} m
			WHERE m.${c('id')} = ${threadId}
			AND (m.${c('resourceId')} LIKE 'integration:%' OR m.${c('resourceId')} LIKE 'task:%')
		)`;

		await runQuery(
			`UPDATE ${threads} SET ${c('accessScope')} = 'project'
			WHERE (${threads}.${c('taskId')} IS NOT NULL OR ${hasProjectMemory} OR ${hasProjectExecution})
			AND NOT (${hasPreviewMemory} OR ${threadId} LIKE ${legacyPrefix} || '%' OR ${hasPreviewExecution})`,
			{ previewSources, projectSources },
		);

		await runQuery(`UPDATE ${threads} SET ${c('ownerId')} = (
			SELECT u.${c('id')} FROM ${memory} m JOIN ${users} u
			ON m.${c('resourceId')} = 'draft-chat:' || CAST(u.${c('id')} AS TEXT)
			WHERE m.${c('id')} = ${threadId}
		) WHERE ${threads}.${c('accessScope')} = 'user' AND ${hasPreviewMemory}`);

		await runQuery(`UPDATE ${threads} SET ${c('ownerId')} = (
			SELECT u.${c('id')} FROM ${users} u
			WHERE ${threadId} = ${legacyPrefix} || CAST(u.${c('id')} AS TEXT)
		) WHERE ${threads}.${c('accessScope')} = 'user'
			AND ${threads}.${c('ownerId')} IS NULL
			AND NOT (${hasPreviewMemory})
			AND ${threadId} LIKE ${legacyPrefix} || '%'`);
	}

	private async backfillInheritedAccess({ escape, runQuery }: MigrationContext) {
		const c = escape.columnName;
		const threads = escape.tableName('agent_execution_threads');
		const parentMatches = `parent.${c('id')} = ${threads}.${c('parentThreadId')}
			AND parent.${c('agentId')} = ${threads}.${c('parentAgentId')}
			AND parent.${c('projectId')} = ${threads}.${c('projectId')}`;
		const parentHasAccess = `(parent.${c('accessScope')} = 'project'
			OR parent.${c('ownerId')} IS NOT NULL)`;

		await runQuery(`UPDATE ${threads} SET
			${c('ownerId')} = (
				SELECT parent.${c('ownerId')} FROM ${threads} parent
				WHERE ${parentMatches} AND ${parentHasAccess}
			),
			${c('accessScope')} = (
				SELECT parent.${c('accessScope')} FROM ${threads} parent
				WHERE ${parentMatches} AND ${parentHasAccess}
			)
			WHERE EXISTS (
				SELECT 1 FROM ${threads} parent
				WHERE ${parentMatches} AND ${parentHasAccess}
			)`);
	}
}
