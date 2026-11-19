import type { MigrationContext, ReversibleMigration } from '../migration-types';

const collectionTable = 'knowledge_collection';
const shareTable = 'shared_knowledge_collection';
const fileTable = 'knowledge_file';
const vectorStoreTable = 'knowledge_vector_store';
const agentDependencyTable = 'agent_knowledge_dependency';

/**
 * Knowledge collections: files and vector stores that agents search. A shared
 * collection belongs to a project and other projects can get a share of it. A
 * private collection belongs to one agent.
 *
 * The owner project is in `knowledge_collection.projectId` and in the owner
 * row of `shared_knowledge_collection`. The column is the source of truth.
 * A project delete removes its collections and their rows through the cascade.
 */
export class CreateKnowledgeCollectionTables1795076463180 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createCollectionTable(context);
		await this.createShareTable(context);
		await this.createFileTable(context);
		await this.createVectorStoreTable(context);
		await this.createAgentDependencyTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(agentDependencyTable);
		await dropTable(vectorStoreTable);
		await dropTable(fileTable);
		await dropTable(shareTable);
		await dropTable(collectionTable);
	}

	private async createCollectionTable({
		schemaBuilder: { createTable, column },
		tablePrefix,
		escape,
		isSqlite,
	}: MigrationContext) {
		const [kind, agentId, projectId, isGlobal] = ['kind', 'agentId', 'projectId', 'isGlobal'].map(
			(columnName) => escape.columnName(columnName),
		);
		const falseValue = isSqlite ? '0' : 'FALSE';

		await createTable(collectionTable)
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				column('name')
					.varchar(128)
					.notNull.comment('Name of the collection, unique in the project of a shared collection'),
				column('description').varchar(512).comment('Tells the agent when to use the collection'),
				column('slug')
					.varchar(24)
					.notNull.comment(
						'Tool-safe identifier, unique on the instance. Set at creation and never changed',
					),
				// No CHECK on the list of values: the service validates them. The owner
				// CHECK below ties 'agent' to agentId.
				column('kind')
					.varchar(16)
					.notNull.comment(
						"'shared' (belongs to a project) or 'agent' (the private collection of one agent)",
					),
				column('projectId')
					.varchar(36)
					.comment('Home project of a shared collection. NULL for an agent collection'),
				column('agentId')
					.varchar(36)
					.comment('Agent that owns a private collection. NULL for a shared collection'),
				column('isGlobal')
					.bool.notNull.default(false)
					.comment('Every agent on the instance can use a global collection'),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn(['slug'], true)
			// An agent collection has no project, so its name does not collide with others.
			.withIndexOn(['projectId', 'name'], true)
			// One private collection for each agent. Both databases let many NULLs pass a
			// unique index, so a plain index has the effect of a partial one.
			.withIndexOn(['agentId'], true)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			// A collection has exactly one owner, a project or an agent. Only a collection
			// that an agent owns has the kind 'agent'. A private collection is not global.
			.withCheck(
				`CHK_${tablePrefix}knowledge_collection_owner`,
				`((${agentId} IS NULL) <> (${projectId} IS NULL)) AND ((${kind} = 'agent') = (${agentId} IS NOT NULL)) AND (${agentId} IS NULL OR ${isGlobal} = ${falseValue})`,
			);
	}

	/** Same shape as `shared_credentials`, so the permission checks can reuse the credential code. */
	private async createShareTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
		escape,
	}: MigrationContext) {
		await createTable(shareTable)
			.withColumns(
				column('knowledgeCollectionId').varchar(16).primary,
				column('projectId').varchar(36).primary,
				// No CHECK on the values: the service validates them.
				column('role')
					.varchar(32)
					.notNull.comment(
						"'knowledgeCollection:owner' (the home project, as in knowledge_collection.projectId) or 'knowledgeCollection:user'",
					),
			)
			.withTimestamps.withIndexOn(['projectId'])
			.withForeignKey('knowledgeCollectionId', {
				tableName: collectionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// At most one owner row for each collection. Two requests at the same time can
		// both pass a check in the service, so only the database can enforce this.
		await createIndex(
			shareTable,
			['knowledgeCollectionId'],
			true,
			`IDX_${tablePrefix}shared_knowledge_collection_owner`,
			`${escape.columnName('role')} = 'knowledgeCollection:owner'`,
		);
	}

	/** `storedAt` and `storageKey` work as in `agent_files`. */
	private async createFileTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(fileTable)
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				column('knowledgeCollectionId')
					.varchar(16)
					.notNull.comment('Collection that holds this uploaded file'),
				column('name').varchar(255).notNull,
				column('description').text,
				column('storedAt')
					.varchar(2)
					.notNull.default("'db'")
					.withEnumCheck(['db', 'fs', 's3', 'az'])
					.comment(
						"Where the file bytes live: 'db' (binary_data table), or a blob-storage backend ('fs', 's3', 'az')",
					),
				column('storageKey').text.notNull.comment(
					'Key addressing the bytes within storedAt: a binary_data.fileId for db, a byte-store key otherwise. Not a foreign key',
				),
				column('mimeType').varchar(255).notNull,
				column('fileSizeBytes').int.notNull.comment('Uploaded file size in bytes'),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn(['knowledgeCollectionId', 'name'], true)
			.withIndexOn(['knowledgeCollectionId', 'createdAt'])
			.withForeignKey('knowledgeCollectionId', {
				tableName: collectionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	private async createVectorStoreTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(vectorStoreTable)
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				column('knowledgeCollectionId')
					.varchar(16)
					.notNull.comment('Collection that holds this vector store connection'),
				column('name')
					.varchar(64)
					.notNull.comment('Part of the search tool name, so it is unique in its collection'),
				column('description')
					.varchar(512)
					.notNull.comment('Tells the agent when to search this store'),
				// No CHECK on the values: the list of providers grows, and on SQLite each new
				// value would rebuild the table. The service validates them.
				column('provider')
					.varchar(16)
					.notNull.comment(
						"Vector store provider, e.g. 'pinecone', 'supabase', 'qdrant' or 'postgres'",
					),
				column('credentialId')
					.varchar(36)
					.comment(
						'Credential of the store. NULL after the credential is deleted: the store is then unavailable',
					),
				column('embeddingCredentialId')
					.varchar(36)
					.comment(
						'Credential of the embedding model. NULL after the credential is deleted: the store is then unavailable',
					),
				column('embeddingModel')
					.varchar(255)
					.notNull.comment("Embedding model in 'provider/model-name' format"),
				column('config').json.notNull.comment(
					'Provider settings, such as an index name, a namespace or a table name',
				),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn(['knowledgeCollectionId', 'name'], true)
			// Both indexes serve the SET NULL when a credential is deleted.
			.withIndexOn(['credentialId'])
			.withIndexOn(['embeddingCredentialId'])
			.withForeignKey('knowledgeCollectionId', {
				tableName: collectionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('embeddingCredentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	private async createAgentDependencyTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(agentDependencyTable)
			.withColumns(
				column('agentId').varchar(36).primary,
				column('knowledgeCollectionId').varchar(16).primary,
			)
			.withCreatedAt.withIndexOn(['knowledgeCollectionId'])
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('knowledgeCollectionId', {
				tableName: collectionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}
}
