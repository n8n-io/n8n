import type { StorageLocation } from '@n8n/blob-storage';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_files' })
@Index(['agentId', 'createdAt'])
@Index(['agentId', 'fileName'], { unique: true })
@Index(['agentId', 'storageKey'], { unique: true })
export class AgentFile extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	/**
	 * Blob-storage location for the file bytes: 'fs', 's3', or 'az'. Never 'db'.
	 * Bytes are resolved via AgentKnowledgeFileStore.
	 */
	@Column({ type: 'varchar', length: 2, nullable: false, default: 'fs' })
	storedAt: StorageLocation;

	/**
	 * Byte-store key addressing the bytes within `storedAt`. Persisted rather
	 * than derived, so files written under the former BinaryDataService layout
	 * keep resolving after the storage migration.
	 */
	@Column({ type: 'text' })
	storageKey: string;

	// fileName/mimeType/fileSizeBytes are intentionally denormalized rather than
	// joined from storage metadata: we keep the original user-facing values,
	// which differ from the stored bytes for converted uploads (a PDF is stored
	// as extracted text with a different byte size).
	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;
}
