import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

import type { KnowledgeSourceStatus, KnowledgeSourceType } from '../../knowledge.constants';

/** An external or internal data source that gets indexed into the vector store. */
@Entity({ name: 'knowledge_sources' })
export class KnowledgeSource extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 16 })
	type: KnowledgeSourceType;

	/** Null for connectors that need no credential, e.g. the internal `n8n` source. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	/** Connector-specific settings, validated by the connector's `parseConfig`. */
	@JsonColumn()
	config: Record<string, unknown>;

	@Column({ type: 'varchar', length: 16, default: 'pending' })
	status: KnowledgeSourceStatus;

	@DateTimeColumn({ precision: 3, nullable: true })
	lastSyncedAt: Date | null;

	/** Connector-owned cursor carried between incremental syncs; null before the first full sync. */
	@JsonColumn({ nullable: true })
	checkpoint: Record<string, unknown> | null;

	@Column({ type: 'text', nullable: true })
	lastError: string | null;
}
