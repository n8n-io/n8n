import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentApprovalJobKind1794242589192 implements ReversibleMigration {
	async up({
		schemaBuilder: { dropEnumCheck, addEnumCheck, addColumns, column, createIndex, addForeignKey },
		isPostgres,
		escape,
		runQuery,
	}: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[
				column('parentRunId')
					.varchar(128)
					.comment('Agent SDK run ID retained by this approval request'),
				column('callerExecutionId').int.comment('Workflow execution waiting for this approval'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_background_job',
			'callerExecutionId',
			['execution_entity', 'id'],
			'FK_agent_approval_caller_execution',
			'SET NULL',
		);
		await createIndex('agent_background_job', ['callerExecutionId']);
		await dropEnumCheck('agent_background_job', 'kind', { recreatesOnSqlite: true });
		await addEnumCheck('agent_background_job', 'kind', ['subagent', 'workflow', 'approval'], {
			recreatesOnSqlite: true,
		});
		await createIndex(
			'agent_background_job',
			['parentAgentId', 'parentRunId'],
			false,
			undefined,
			'"kind" = \'approval\' AND "notifiedAt" IS NULL',
		);
		if (isPostgres)
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName('agent_background_job')}.${escape.columnName('kind')} IS 'subagent: detached Agent; workflow: background workflow; approval: decision workflow for a suspended Agent'`,
			);
	}

	async down({
		schemaBuilder: { dropEnumCheck, addEnumCheck, dropColumns, dropIndex, dropForeignKey },
		escape,
		runQuery,
		isPostgres,
	}: MigrationContext) {
		await dropIndex('agent_background_job', ['parentAgentId', 'parentRunId']);
		await dropIndex('agent_background_job', ['callerExecutionId']);
		await dropForeignKey(
			'agent_background_job',
			'callerExecutionId',
			['execution_entity', 'id'],
			'FK_agent_approval_caller_execution',
		);
		const table = escape.tableName('agent_background_job');
		const kind = escape.columnName('kind');
		// Older versions must not deliver approval results as a new Agent turn.
		await runQuery(
			`UPDATE ${table} SET ${kind} = 'workflow', ${escape.columnName('status')} = 'cancelled', ${escape.columnName('error')} = 'Workflow approval is unavailable after this downgrade', ${escape.columnName('notifiedAt')} = CURRENT_TIMESTAMP, ${escape.columnName('settledAt')} = CURRENT_TIMESTAMP, ${escape.columnName('timeoutAt')} = NULL WHERE ${kind} = 'approval'`,
		);
		await dropEnumCheck('agent_background_job', 'kind', { recreatesOnSqlite: true });
		await addEnumCheck('agent_background_job', 'kind', ['subagent', 'workflow'], {
			recreatesOnSqlite: true,
		});
		await dropColumns('agent_background_job', ['parentRunId', 'callerExecutionId'], {
			recreatesOnSqlite: true,
		});
		if (isPostgres)
			await runQuery(
				`COMMENT ON COLUMN ${table}.${kind} IS 'What the job tracks: a detached sub-agent run or a workflow execution'`,
			);
	}
}
