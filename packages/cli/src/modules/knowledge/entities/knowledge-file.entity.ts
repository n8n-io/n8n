import { WithTimestampsAndStringId, type ExecutionDataStorageLocation } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

/**
 * An uploaded file in a knowledge collection. The database deletes the row
 * with its collection, but not the stored bytes: code that deletes a project,
 * an agent or a collection deletes the bytes first (see the module AGENTS.md).
 */
@Entity({ name: 'knowledge_file' })
@Index(['knowledgeCollectionId', 'createdAt'])
@Index(['knowledgeCollectionId', 'name'], { unique: true })
export class KnowledgeFile extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 16 })
	knowledgeCollectionId: string;

	// name/mimeType/fileSizeBytes are intentionally denormalized rather than
	// joined from storage metadata: we keep the original user-facing values,
	// which differ from the stored bytes for converted uploads (a PDF is stored
	// as extracted text with a different byte size).
	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	/**
	 * Where the file bytes live: 'db' (the `binary_data` table) or a blob-storage
	 * backend ('fs', 's3', 'az'). Bytes are resolved via KnowledgeFileStore.
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

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
