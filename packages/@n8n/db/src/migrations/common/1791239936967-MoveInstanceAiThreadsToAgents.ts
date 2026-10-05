import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const threadsTable = 'agent_execution_threads';

/** Run state, memory and checkpoints that now live in the Agents tables. */
const replacedTables = [
	'instance_ai_pending_confirmations',
	'instance_ai_checkpoints',
	'instance_ai_messages',
	'instance_ai_observations',
	'instance_ai_observation_cursors',
	'instance_ai_observation_locks',
	'instance_ai_resources',
	'instance_ai_thread_grants',
];

/** Assistant data that stays, but belongs to an Agents session now. */
const rehomedTables = [
	'instance_ai_events',
	'instance_ai_thread_tabs',
	'instance_ai_iteration_logs',
];

/**
 * The n8n Assistant runs as the `n8n-assistant` instance agent on the Agents
 * runtime. Its conversations are Agents sessions (`agent_execution_threads`)
 * and its memory, checkpoints and grants are Agents rows. This drops the
 * replaced `instance_ai_*` tables and re-creates the remaining ones with
 * foreign keys to Agents sessions. Old Assistant conversations are dropped.
 */
export class MoveInstanceAiThreadsToAgents1791239936967 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { dropTable } = context.schemaBuilder;
		for (const table of replacedTables) await dropTable(table);
		for (const table of rehomedTables) await dropTable(table);
		await dropTable('ai_builder_temporary_workflow');
		await dropTable('instance_ai_threads');

		await this.createEventsTable(context);
		await this.createThreadTabsTable(context);
		await this.createIterationLogsTable(context);
		await this.createTemporaryWorkflowTable(context);
	}

	private async createEventsTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('instance_ai_events')
			.withColumns(
				column('threadId').varchar(36).primary.comment('Agents session id'),
				column('seq').int.primary.comment('Per-thread monotonic sequence, the SSE replay cursor'),
				column('runId').varchar(64).notNull,
				column('type').varchar(64).notNull.comment('Event type, copied from the payload'),
				column('payload').text.notNull.comment('JSON of the canonical InstanceAiEvent'),
			)
			.withTimestamps.withIndexOn(['threadId', 'runId'])
			.withForeignKey('threadId', {
				tableName: threadsTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createThreadTabsTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable('instance_ai_thread_tabs')
			.withColumns(
				column('threadId').varchar(36).primary.comment('Agents session id'),
				column('userId').uuid.primary,
				column('state').json.notNull.comment('Open artifact tabs of the thread for the user'),
			)
			.withTimestamps.withIndexOn('userId')
			.withForeignKey('threadId', {
				tableName: threadsTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' });
	}

	private async createIterationLogsTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable('instance_ai_iteration_logs')
			.withColumns(
				column('id').varchar(36).primary,
				column('threadId').varchar(36).notNull.comment('Agents session id'),
				column('taskKey').varchar(255).notNull,
				column('entry').text.notNull.comment('JSON of one build attempt'),
			)
			.withTimestamps.withIndexOn(['threadId', 'taskKey', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: threadsTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createTemporaryWorkflowTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable('ai_builder_temporary_workflow')
			.withColumns(
				column('workflowId').varchar(36).primary,
				column('threadId').varchar(36).notNull.comment('Agents session id'),
			)
			.withTimestamps.withIndexOn('threadId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('threadId', {
				tableName: threadsTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}
}
