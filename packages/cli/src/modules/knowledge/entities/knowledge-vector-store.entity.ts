import type { AgentVectorStoreProvider } from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

/**
 * One connection to an external vector store in a knowledge collection. Each
 * store becomes one search tool of the agent.
 */
@Entity({ name: 'knowledge_vector_store' })
@Index(['knowledgeCollectionId', 'name'], { unique: true })
export class KnowledgeVectorStore extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 16 })
	knowledgeCollectionId: string;

	/** Part of the search tool name, so it is unique in its collection. */
	@Column({ type: 'varchar', length: 64 })
	name: string;

	/** Tells the agent when to search this store. */
	@Column({ type: 'varchar', length: 512 })
	description: string;

	/**
	 * The column has no CHECK: the list of providers grows, so the service
	 * validates the value.
	 */
	@Column({ type: 'varchar', length: 16 })
	provider: AgentVectorStoreProvider;

	/** Null after the credential is deleted: the store is then unavailable. */
	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	/** Null after the credential is deleted: the store is then unavailable. */
	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	embeddingCredentialId: string | null;

	/** In `provider/model-name` format. */
	@Column({ type: 'varchar', length: 255 })
	embeddingModel: string;

	/** Provider settings, such as an index name, a namespace or a table name. */
	@JsonColumn()
	config: Record<string, unknown>;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
