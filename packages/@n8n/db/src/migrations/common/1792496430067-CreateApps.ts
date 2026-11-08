import type { MigrationContext, ReversibleMigration } from '../migration-types';

const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
];

export class CreateApps1792496430067 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { createTable, column, addForeignKey } = ctx.schemaBuilder;

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
			column('appId').uuid.notNull.comment(
				'No foreign key so the owning app ID remains available for cleanup after app deletion.',
			),
			column('storedAt')
				.varchar(2)
				.notNull.withEnumCheck(['db', 'fs', 's3', 'az'])
				.comment('Storage backend: database, filesystem, S3, or Azure'),
			column('storageKey').text.notNull.comment(
				'Reference to the object within its storage backend',
			),
			column('sizeBytes').int.notNull,
			column('uploadStatus')
				.varchar(16)
				.notNull.default("'pending'")
				.withEnumCheck(['pending', 'completed'])
				.comment('Upload state: pending or completed'),
		).withTimestamps;

		await createTable('app_version')
			.withColumns(
				column('id').uuid.primary,
				column('appId').uuid.notNull,
				column('label').varchar(255),
				column('sourceArtifactId').int.notNull,
				column('bundleArtifactId').int,
				column('buildAttempts').int.notNull.default(0),
				column('buildStatus')
					.varchar(16)
					.notNull.default("'queued'")
					.withEnumCheck(['queued', 'running', 'succeeded', 'failed'])
					.comment('Build state: queued, running, succeeded, or failed'),
				column('buildStatusUpdatedAt').timestampTimezone(),
			)
			.withTimestamps.withIndexOn('appId')
			.withIndexOn('sourceArtifactId')
			.withIndexOn('bundleArtifactId')
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

		await this.replaceSourceTypeCheck(ctx, [...sourceTypesBefore, 'app_artifact']);
	}

	async down(ctx: MigrationContext) {
		const { dropForeignKey, dropTable } = ctx.schemaBuilder;
		await ctx.runQuery(
			`DELETE FROM ${ctx.escape.tableName('binary_data')} WHERE ${ctx.escape.columnName('sourceType')} = 'app_artifact'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);

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

	private async replaceSourceTypeCheck(
		{
			schemaBuilder: { dropEnumCheck, addEnumCheck },
			isPostgres,
			runQuery,
			escape,
			tablePrefix,
		}: MigrationContext,
		values: string[],
	) {
		await dropEnumCheck('binary_data', 'sourceType', { recreatesOnSqlite: true });
		if (isPostgres) {
			const constraintName = escape.columnName(`CHK_${tablePrefix}binary_data_sourceType`);
			const allowedValues = values.map((value) => `'${value}'`).join(', ');
			await runQuery(
				`ALTER TABLE ${escape.tableName('binary_data')} ADD CONSTRAINT ${constraintName} CHECK (${escape.columnName('sourceType')} IN (${allowedValues})) NOT VALID`,
			);
			return;
		}
		await addEnumCheck('binary_data', 'sourceType', values, { recreatesOnSqlite: true });
	}
}
