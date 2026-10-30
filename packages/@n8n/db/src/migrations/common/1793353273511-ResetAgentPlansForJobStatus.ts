import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class ResetAgentPlansForJobStatus1793353273511 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		await this.clearStopReferences(ctx);
		await this.clearResumeReferences(ctx);

		const { escape, runQuery } = ctx;
		const oldPlans = `SELECT ${escape.columnName('id')} FROM ${escape.tableName('agent_plan')} WHERE ${escape.columnName('formatVersion')} < 2`;

		await runQuery(
			`UPDATE ${escape.tableName('agent_background_job')} SET ${escape.columnName('planId')} = NULL, ${escape.columnName('planTaskId')} = NULL WHERE ${escape.columnName('planId')} IN (${oldPlans})`,
		);

		await runQuery(
			`DELETE FROM ${escape.tableName('agent_plan_history')} WHERE ${escape.columnName('planId')} IN (${oldPlans})`,
		);

		await runQuery(
			`DELETE FROM ${escape.tableName('agent_plan')} WHERE ${escape.columnName('formatVersion')} < 2`,
		);
	}

	private async isOldPlan(ctx: MigrationContext, planId: unknown) {
		if (typeof planId !== 'string') return false;

		const rows = await ctx.runQuery<Array<{ id: string }>>(
			`SELECT ${ctx.escape.columnName('id')} FROM ${ctx.escape.tableName('agent_plan')} WHERE ${ctx.escape.columnName('id')} = :planId AND ${ctx.escape.columnName('formatVersion')} < 2`,
			{ planId },
		);

		return rows.length > 0;
	}

	private async clearStopReferences(ctx: MigrationContext) {
		const { escape, runInBatches, runQuery, parseJson, logger } = ctx;

		// Updates keep the row set, so a stable order keeps offset pages from skipping rows.
		await runInBatches<{ id: string; taskStop: string }>(
			`SELECT ${escape.columnName('id')}, ${escape.columnName('taskStop')} FROM ${escape.tableName('agent_execution_threads')} WHERE ${escape.columnName('taskStop')} IS NOT NULL ORDER BY ${escape.columnName('id')}`,
			async (rows) => {
				for (const row of rows) {
					let stop: Record<string, unknown>;

					try {
						stop = parseJson<Record<string, unknown>>(row.taskStop);
					} catch {
						logger.warn(`Cannot read Stop data for thread ${row.id}`);

						continue;
					}

					if (!stop || typeof stop !== 'object' || !(await this.isOldPlan(ctx, stop.planId)))
						continue;

					stop.planId = null;
					delete stop.planRevision;
					delete stop.stoppedTaskIds;
					delete stop.restartTaskIds;

					await runQuery(
						`UPDATE ${escape.tableName('agent_execution_threads')} SET ${escape.columnName('taskStop')} = :value WHERE ${escape.columnName('id')} = :id`,
						{ value: JSON.stringify(stop), id: row.id },
					);
				}
			},
		);
	}

	private async clearResumeReferences(ctx: MigrationContext) {
		const { escape, runInBatches, runQuery, parseJson, logger } = ctx;

		await runInBatches<{ runId: string; state: string }>(
			`SELECT ${escape.columnName('runId')}, ${escape.columnName('state')} FROM ${escape.tableName('agent_checkpoints')} WHERE ${escape.columnName('state')} IS NOT NULL ORDER BY ${escape.columnName('runId')}`,
			async (rows) => {
				for (const row of rows) {
					let state: { persistence?: { hostMetadata?: Record<string, unknown> } };

					try {
						state = parseJson<typeof state>(row.state);
					} catch {
						logger.warn(`Cannot read checkpoint ${row.runId}`);

						continue;
					}

					const metadata = state?.persistence?.hostMetadata;
					const ref = metadata?.n8nPlanTask;

					if (
						!metadata ||
						!ref ||
						typeof ref !== 'object' ||
						!('planId' in ref) ||
						!(await this.isOldPlan(ctx, ref.planId))
					)
						continue;

					delete metadata.n8nPlanTask;

					await runQuery(
						`UPDATE ${escape.tableName('agent_checkpoints')} SET ${escape.columnName('state')} = :value WHERE ${escape.columnName('runId')} = :runId`,
						{ value: JSON.stringify(state), runId: row.runId },
					);
				}
			},
		);
	}
}
