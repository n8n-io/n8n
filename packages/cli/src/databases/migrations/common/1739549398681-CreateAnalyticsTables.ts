import type { MigrationContext, ReversibleMigration } from '@/databases/types';

const names = {
	// table names
	t: {
		analyticsMetadata: 'analytics_metadata',
		analyticsRaw: 'analytics_raw',
		analyticsByPeriod: 'analytics_by_period',
		workflowEntity: 'workflow_entity',
		project: 'project',
	},
	// column names by table
	c: {
		analyticsMetadata: {
			metaId: 'metaId',
			projectId: 'projectId',
			workflowId: 'workflowId',
		},
		analyticsRaw: {
			metaId: 'metaId',
		},
		analyticsByPeriod: {
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

export class CreateAnalyticsTables1739549398681 implements ReversibleMigration {
	async up({ dbType, schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(names.t.analyticsMetadata)
			.withColumns(
				column(names.c.analyticsMetadata.metaId).int.primary.autoGenerate,
				column(names.c.analyticsMetadata.workflowId).varchar(16),
				column(names.c.analyticsMetadata.projectId).varchar(36),
				column('workflowName').varchar(128).notNull,
				column('projectName').varchar(255).notNull,
			)
			.withForeignKey(names.c.analyticsMetadata.workflowId, {
				tableName: names.t.workflowEntity,
				columnName: names.c.workflowEntity.id,
				onDelete: 'SET NULL',
			})
			.withForeignKey(names.c.analyticsMetadata.projectId, {
				tableName: names.t.project,
				columnName: names.c.project.id,
				onDelete: 'SET NULL',
			});

		const timestampDefault =
			dbType === 'mariadb' || dbType === 'mysqldb' ? 'CURRENT_TIMESTAMP' : "'NOW'";

		await createTable(names.t.analyticsRaw)
			.withColumns(
				column('id').int.primary.autoGenerate,
				column(names.c.analyticsRaw.metaId).int.notNull,
				column('type').int.notNull,
				column('value').int.notNull,
				column('timestamp').timestamp(0).default(timestampDefault).notNull,
			)
			.withForeignKey(names.c.analyticsRaw.metaId, {
				tableName: names.t.analyticsMetadata,
				columnName: names.c.analyticsMetadata.metaId,
				onDelete: 'CASCADE',
			});

		await createTable(names.t.analyticsByPeriod)
			.withColumns(
				column('id').int.primary.autoGenerate,
				column(names.c.analyticsByPeriod.metaId).int.notNull,
				column(names.c.analyticsByPeriod.type).int.notNull,
				column('value').int.notNull,
				column(names.c.analyticsByPeriod.periodUnit).int.notNull,
				column(names.c.analyticsByPeriod.periodStart).timestamp(0),
			)
			.withForeignKey(names.c.analyticsByPeriod.metaId, {
				tableName: names.t.analyticsMetadata,
				columnName: names.c.analyticsMetadata.metaId,
				onDelete: 'CASCADE',
			})
			.withIndexOn(
				[
					names.c.analyticsByPeriod.metaId,
					names.c.analyticsByPeriod.type,
					names.c.analyticsByPeriod.periodUnit,
					names.c.analyticsByPeriod.periodStart,
				],
				true,
			);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(names.t.analyticsMetadata);
		await dropTable(names.t.analyticsRaw);
		await dropTable(names.t.analyticsByPeriod);
	}
}
