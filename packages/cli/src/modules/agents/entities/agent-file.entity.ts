import { WithTimestampsAndStringId, type ExecutionDataStorageLocation } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

/**
 * The table still carries a nullable `binaryDataId` and its unique index, left
 * behind by `AddAgentFileStorageColumns` so the previous release can read the
 * rows it wrote. It is deliberately absent here — new rows leave it null — and
 * a follow-up migration drops it.
 */
@Entity({ name: 'agent_files' })
@Index(['agentId', 'createdAt'])
@Index(['agentId', 'fileName'], { unique: true })
export class AgentFile extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	/**
	 * Where the file bytes live: 'db' (the `binary_data` table) or a blob-storage
	 * backend ('fs', 's3', 'az'). Bytes are resolved via AgentKnowledgeFileStore.
	 */
	@Column({ type: 'varchar', length: 2, nullable: false, default: 'db' })
	storedAt: ExecutionDataStorageLocation;

	/**
	 * Key addressing the bytes within `storedAt`: a `binary_data.fileId` for
	 * 'db', a byte-store key otherwise. Persisted rather than derived, so files
	 * written under the former BinaryDataService layout keep resolving after the
	 * storage migration.
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
