import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateApps1791897793262 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, addForeignKey }, isSqlite }: MigrationContext) {
		await createTable('app')
			.withColumns(
				column('id').uuid.primary,
				column('name').varchar(128).notNull,
				column('namespace').varchar(128).notNull.comment('Unique URL path segment for the app'),
				column('visibility')
					.varchar(16)
					.notNull.default("'project'")
					.withEnumCheck(['public', 'project', 'instance'])
					.comment('App access: everyone, project members, or instance users'),
				column('projectId').varchar(36).notNull,
				column('draftVersionId').uuid.comment('Current working app version'),
				column('publishedVersionId').uuid.comment('Published app version; null when unpublished'),
			)
			.withTimestamps.withIndexOn('namespace', true)
			.withIndexOn('projectId')
			.withIndexOn('draftVersionId')
			.withIndexOn('publishedVersionId')
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await createTable('app_artifact').withColumns(
			column('id').int.primary.autoGenerate2,
			column('storedAt')
				.varchar(2)
				.notNull.withEnumCheck(['db', 'fs', 's3', 'az'])
				.comment('Storage backend: database, filesystem, S3, or Azure'),
			column('storageKey').text.notNull.comment(
				'Reference to the object within its storage backend',
			),
			column('sizeBytes').int.notNull,
		);

		await createTable('app_version')
			.withColumns(
				column('id').uuid.primary,
				column('appId').uuid.notNull,
				column('label').varchar(255),
				column('sourceArtifactId').int.notNull,
				column('bundleArtifactId').int,
				(isSqlite ? column('buildTaskId').int : column('buildTaskId').bigint).comment(
					'Current build task; null before dispatch or after task cleanup',
				),
				column('buildStatus')
					.varchar(16)
					.notNull.default("'queued'")
					.withEnumCheck(['queued', 'running', 'succeeded', 'failed'])
					.comment('Build state: queued, running, succeeded, or failed'),
			)
			.withTimestamps.withIndexOn('appId')
			.withIndexOn('sourceArtifactId')
			.withIndexOn('bundleArtifactId')
			.withIndexOn('buildTaskId')
			.withForeignKey('appId', {
				tableName: 'app',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('sourceArtifactId', {
				tableName: 'app_artifact',
				columnName: 'id',
				onDelete: 'RESTRICT',
			})
			.withForeignKey('bundleArtifactId', {
				tableName: 'app_artifact',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('buildTaskId', {
				tableName: 'scheduled_task',
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		await addForeignKey(
			'app',
			'draftVersionId',
			['app_version', 'id'],
			'app_draftVersionId_foreign',
			'SET NULL',
		);
		await addForeignKey(
			'app',
			'publishedVersionId',
			['app_version', 'id'],
			'app_publishedVersionId_foreign',
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropForeignKey, dropTable } }: MigrationContext) {
		await dropForeignKey(
			'app',
			'publishedVersionId',
			['app_version', 'id'],
			'app_publishedVersionId_foreign',
		);
		await dropForeignKey(
			'app',
			'draftVersionId',
			['app_version', 'id'],
			'app_draftVersionId_foreign',
		);
		await dropTable('app_version');
		await dropTable('app_artifact');
		await dropTable('app');
	}
}
