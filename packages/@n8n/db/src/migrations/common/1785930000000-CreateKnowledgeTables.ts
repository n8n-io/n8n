import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SOURCE_TABLE = 'knowledge_sources';
const DOCUMENT_TABLE = 'knowledge_documents';
const SYNC_RUN_TABLE = 'knowledge_sync_runs';

/**
 * Bookkeeping for knowledge connectors. The indexed text and its vectors live
 * in the external vector store; these tables only track what was indexed, from
 * where, and how the last sync went.
 */
export class CreateKnowledgeTables1785930000000 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createSourceTable(context);
		await this.createDocumentTable(context);
		await this.createSyncRunTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(SYNC_RUN_TABLE);
		await dropTable(DOCUMENT_TABLE);
		await dropTable(SOURCE_TABLE);
	}

	private async createSourceTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(SOURCE_TABLE).withColumns(
			column('id').varchar(36).primary,
			column('name').varchar(128).notNull,
			column('type')
				.varchar(16)
				.notNull.withEnumCheck(['github', 'n8n'])
				.comment('Selects which connector implementation syncs this source.'),
			column('credentialId')
				.varchar(36)
				.comment('NULL for connectors that need no credential, e.g. the internal n8n source.'),
			column('config')
				.json.notNull.default("'{}'")
				.comment('Connector-specific settings, validated by the connector.'),
			column('status')
				.varchar(16)
				.notNull.default("'pending'")
				.withEnumCheck(['pending', 'syncing', 'ready', 'error']),
			column('lastSyncedAt').timestampTimezone(),
			column('checkpoint').json.comment(
				'Connector-owned cursor for the next incremental sync; NULL before the first sync.',
			),
			column('lastError').text,
		).withTimestamps;
	}

	private async createDocumentTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(DOCUMENT_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('sourceId').varchar(36).notNull,
				column('externalId')
					.varchar(255)
					.notNull.comment("Stable identifier within the source, e.g. 'issue:123'."),
				column('title').varchar(512).notNull,
				column('url').varchar(1024),
				column('contentHash')
					.varchar(64)
					.notNull.comment(
						'Fingerprint of the indexed text; an unchanged hash skips re-embedding.',
					),
				column('chunkCount').int.notNull.default(0),
				column('meta').json.comment('Flat metadata copied onto every chunk of this document.'),
				column('sourceUpdatedAt').timestampTimezone(),
			)
			// One row per document per source; also indexes the FK for cascade deletes.
			.withIndexOn(['sourceId', 'externalId'], true)
			.withForeignKey('sourceId', {
				tableName: SOURCE_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	private async createSyncRunTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(SYNC_RUN_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('sourceId').varchar(36).notNull,
				column('mode').varchar(16).notNull.withEnumCheck(['full', 'incremental']),
				column('status')
					.varchar(16)
					.notNull.default("'running'")
					.withEnumCheck(['running', 'success', 'error']),
				column('stats').json.comment('Counters for the run, e.g. documentsIndexed, chunksWritten.'),
				column('error').text,
				column('startedAt').timestampTimezone().notNull.default('NOW()'),
				column('finishedAt').timestampTimezone().comment('NULL while the run is still going.'),
			)
			// Serves "recent runs for this source" and indexes the FK for cascade deletes.
			.withIndexOn(['sourceId', 'startedAt'])
			.withForeignKey('sourceId', {
				tableName: SOURCE_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}
}
