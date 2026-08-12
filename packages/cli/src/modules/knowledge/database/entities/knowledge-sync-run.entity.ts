import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { KnowledgeSource } from './knowledge-source.entity';
import type { KnowledgeSyncMode, KnowledgeSyncRunStatus } from '../../knowledge.constants';

export interface KnowledgeSyncStats {
	documentsSeen: number;
	documentsIndexed: number;
	documentsSkipped: number;
	documentsDeleted: number;
	chunksWritten: number;
}

/** One sync attempt against a source, kept for troubleshooting and for surfacing progress. */
@Entity({ name: 'knowledge_sync_runs' })
@Index(['sourceId', 'startedAt'])
export class KnowledgeSyncRun extends WithTimestampsAndStringId {
	@ManyToOne(() => KnowledgeSource, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sourceId' })
	source: Relation<KnowledgeSource>;

	@Column({ type: 'varchar', length: 36 })
	sourceId: string;

	@Column({ type: 'varchar', length: 16 })
	mode: KnowledgeSyncMode;

	@Column({ type: 'varchar', length: 16, default: 'running' })
	status: KnowledgeSyncRunStatus;

	@JsonColumn({ nullable: true })
	stats: KnowledgeSyncStats | null;

	@Column({ type: 'text', nullable: true })
	error: string | null;

	@DateTimeColumn({ precision: 3 })
	startedAt: Date;

	@DateTimeColumn({ precision: 3, nullable: true })
	finishedAt: Date | null;
}
