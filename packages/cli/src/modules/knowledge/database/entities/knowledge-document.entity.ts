import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { KnowledgeSource } from './knowledge-source.entity';

/**
 * A document indexed from a source. Holds only the bookkeeping needed to decide
 * whether to re-embed; the text and its vectors live in the vector store.
 */
@Entity({ name: 'knowledge_documents' })
@Index(['sourceId', 'externalId'], { unique: true })
export class KnowledgeDocument extends WithTimestampsAndStringId {
	@ManyToOne(() => KnowledgeSource, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sourceId' })
	source: Relation<KnowledgeSource>;

	@Column({ type: 'varchar', length: 36 })
	sourceId: string;

	/** Stable identifier within the source, e.g. `issue:123`. */
	@Column({ type: 'varchar', length: 255 })
	externalId: string;

	@Column({ type: 'varchar', length: 512 })
	title: string;

	@Column({ type: 'varchar', length: 1024, nullable: true })
	url: string | null;

	/** Fingerprint of the indexed text; an unchanged hash lets a sync skip re-embedding. */
	@Column({ type: 'varchar', length: 64 })
	contentHash: string;

	@Column({ type: 'int', default: 0 })
	chunkCount: number;

	@JsonColumn({ nullable: true })
	meta: Record<string, string | number | boolean> | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	sourceUpdatedAt: Date | null;
}
