import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	planStates: 'instance_ai_plan_states',
	runSnapshots: 'instance_ai_run_snapshots',
	taskRuns: 'instance_ai_task_runs',
} as const;

export class AddInstanceAiRuntimeTables1773000000001 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.planStates)
			.withColumns(
				column('threadId').varchar().primary.notNull,
				column('planId').varchar().notNull,
				column('version').int.default(1).notNull,
				column('plan').json.notNull,
			)
			.withIndexOn('planId').withTimestamps;

		await createTable(table.runSnapshots)
			.withColumns(
				column('id').varchar().primary.notNull,
				column('threadId').varchar().notNull,
				column('runId').varchar().notNull,
				column('messageGroupId').varchar(),
				column('tree').json.notNull,
				column('runIds').json,
			)
			.withIndexOn('threadId')
			.withIndexOn('runId')
			.withIndexOn('messageGroupId').withTimestamps;

		await createTable(table.taskRuns)
			.withColumns(
				column('taskId').varchar().primary.notNull,
				column('threadId').varchar().notNull,
				column('originRunId').varchar().notNull,
				column('messageGroupId').varchar(),
				column('agentId').varchar().notNull,
				column('role').varchar().notNull,
				column('kind').varchar().notNull,
				column('status').varchar().notNull,
				column('planId').varchar(),
				column('phaseId').varchar(),
				column('sortUpdatedAt').bigint.notNull,
				column('data').json.notNull,
			)
			.withIndexOn('threadId')
			.withIndexOn('messageGroupId')
			.withIndexOn('planId')
			.withIndexOn('phaseId').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.taskRuns);
		await dropTable(table.runSnapshots);
		await dropTable(table.planStates);
	}
}
