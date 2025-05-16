import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const names = {
	// table names
	t: {
		analyticsMetadata: 'analytics_metadata',
		analyticsRaw: 'analytics_raw',
		analyticsByPeriod: 'analytics_by_period',

		insightsMetadata: 'insights_metadata',
		insightsRaw: 'insights_raw',
		insightsByPeriod: 'insights_by_period',

		workflowEntity: 'workflow_entity',
		project: 'project',
	},
	// column names by table
	c: {
		insightsMetadata: {
			metaId: 'metaId',
			projectId: 'projectId',
			workflowId: 'workflowId',
		},
		insightsRaw: {
			metaId: 'metaId',
		},
		insightsByPeriod: {
			metaId: 'metaId',
			type: 'type',
			periodUnit: 'periodUnit',
			periodStart: 'periodStart',
		},
		project: {
			id: 'id',
		},
		workflowEntity: {
			id: 'id',
		},
	},
};

export class RenameAnalyticsToInsights1741167584277 implements IrreversibleMigration {
	async up({ schemaBuilder: { createTable, column, dropTable } }: MigrationContext) {
		// Until the insights feature is released we're dropping the tables instead
		// of migrating them.
		await dropTable(names.t.analyticsRaw);
		await dropTable(names.t.analyticsByPeriod);
		await dropTable(names.t.analyticsMetadata);

		await createTable(names.t.insightsMetadata)
			.withColumns(
				column(names.c.insightsMetadata.metaId).int.primary.autoGenerate2,
				column(names.c.insightsMetadata.workflowId).varchar(16),
				column(names.c.insightsMetadata.projectId).varchar(36),
				column('workflowName').varchar(128).notNull,
				column('projectName').varchar(255).notNull,
			)
			.withForeignKey(names.c.insightsMetadata.workflowId, {
				tableName: names.t.workflowEntity,
				columnName: names.c.workflowEntity.id,
				onDelete: 'SET NULL',
			})
			.withForeignKey(names.c.insightsMetadata.projectId, {
				tableName: names.t.project,
				columnName: names.c.project.id,
				onDelete: 'SET NULL',
			})
			.withIndexOn(names.c.insightsMetadata.workflowId, true);

		const typeComment = '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';

		await createTable(names.t.insightsRaw)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column(names.c.insightsRaw.metaId).int.notNull,
				column('type').int.notNull.comment(typeComment),
				column('value').int.notNull,
				column('timestamp').timestampTimezone(0).default('CURRENT_TIMESTAMP').notNull,
			)
			.withForeignKey(names.c.insightsRaw.metaId, {
				tableName: names.t.insightsMetadata,
				columnName: names.c.insightsMetadata.metaId,
				onDelete: 'CASCADE',
			});

		await createTable(names.t.insightsByPeriod)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column(names.c.insightsByPeriod.metaId).int.notNull,
				column(names.c.insightsByPeriod.type).int.notNull.comment(typeComment),
				column('value').int.notNull,
				column(names.c.insightsByPeriod.periodUnit).int.notNull.comment('0: hour, 1: day, 2: week'),
				column(names.c.insightsByPeriod.periodStart)
					.default('CURRENT_TIMESTAMP')
					.timestampTimezone(0),
			)
			.withForeignKey(names.c.insightsByPeriod.metaId, {
				tableName: names.t.insightsMetadata,
				columnName: names.c.insightsMetadata.metaId,
				onDelete: 'CASCADE',
			})
			.withIndexOn(
				[
					names.c.insightsByPeriod.periodStart,
					names.c.insightsByPeriod.type,
					names.c.insightsByPeriod.periodUnit,
					names.c.insightsByPeriod.metaId,
				],
				true,
			);
	}
}
