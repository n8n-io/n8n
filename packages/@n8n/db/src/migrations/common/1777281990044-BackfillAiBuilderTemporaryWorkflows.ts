import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class BackfillAiBuilderTemporaryWorkflows1777281990044 implements ReversibleMigration {
	async up({ escape, isPostgres, runQuery }: MigrationContext) {
		const markerTable = escape.tableName('ai_builder_temporary_workflow');
		const workflowTable = escape.tableName('workflow_entity');
		const workflowIdColumn = escape.columnName('workflowId');
		const threadIdColumn = escape.columnName('threadId');
		const createdAtColumn = escape.columnName('createdAt');
		const updatedAtColumn = escape.columnName('updatedAt');
		const idColumn = escape.columnName('id');
		const metaColumn = escape.columnName('meta');
		const isArchivedColumn = escape.columnName('isArchived');

		if (isPostgres) {
			await runQuery(`
				INSERT INTO ${markerTable} (${workflowIdColumn}, ${threadIdColumn}, ${createdAtColumn}, ${updatedAtColumn})
				SELECT ${idColumn}, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
				FROM ${workflowTable}
				WHERE ${isArchivedColumn} = false
					AND ${metaColumn} ->> 'aiTemporary' = 'true'
				ON CONFLICT (${workflowIdColumn}) DO NOTHING;
			`);

			await runQuery(`
				UPDATE ${workflowTable}
				SET ${metaColumn} = CASE
					WHEN (${metaColumn}::jsonb - 'aiTemporary') = '{}'::jsonb THEN NULL
					ELSE (${metaColumn}::jsonb - 'aiTemporary')::json
				END
				WHERE ${metaColumn}::jsonb ? 'aiTemporary';
			`);
			return;
		}

		await runQuery(`
			INSERT OR IGNORE INTO ${markerTable} (${workflowIdColumn}, ${threadIdColumn}, ${createdAtColumn}, ${updatedAtColumn})
			SELECT ${idColumn}, NULL, STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'), STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
			FROM ${workflowTable}
			WHERE ${isArchivedColumn} = 0
				AND JSON_EXTRACT(${metaColumn}, '$.aiTemporary') = 1;
		`);

		await runQuery(`
			UPDATE ${workflowTable}
			SET ${metaColumn} = CASE
				WHEN JSON_REMOVE(${metaColumn}, '$.aiTemporary') = '{}' THEN NULL
				ELSE JSON_REMOVE(${metaColumn}, '$.aiTemporary')
			END
			WHERE JSON_EXTRACT(${metaColumn}, '$.aiTemporary') IS NOT NULL;
		`);
	}

	async down({ escape, isPostgres, runQuery }: MigrationContext) {
		const markerTable = escape.tableName('ai_builder_temporary_workflow');
		const workflowTable = escape.tableName('workflow_entity');
		const workflowIdColumn = escape.columnName('workflowId');
		const idColumn = escape.columnName('id');
		const metaColumn = escape.columnName('meta');

		if (isPostgres) {
			await runQuery(`
				UPDATE ${workflowTable}
				SET ${metaColumn} = (COALESCE(${metaColumn}::jsonb, '{}'::jsonb) || '{"aiTemporary": true}'::jsonb)::json
				WHERE ${idColumn} IN (SELECT ${workflowIdColumn} FROM ${markerTable});
			`);
			return;
		}

		await runQuery(`
			UPDATE ${workflowTable}
			SET ${metaColumn} = JSON_SET(COALESCE(${metaColumn}, '{}'), '$.aiTemporary', JSON('true'))
			WHERE ${idColumn} IN (SELECT ${workflowIdColumn} FROM ${markerTable});
		`);
	}
}
