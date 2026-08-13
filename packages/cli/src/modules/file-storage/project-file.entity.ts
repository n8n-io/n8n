import { Project, WithTimestampsAndStringId, type ExecutionDataStorageLocation } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

/** Postgres returns `bigint` columns as strings; normalize to number. */
const bigintTransformer = {
	to: (value: number) => value,
	from: (value: string | number) => Number(value),
};

@Entity({ name: 'project_files' })
@Index(['projectId', 'name'], { unique: true })
@Index(['projectId', 'updatedAt'])
export class ProjectFile extends WithTimestampsAndStringId {
	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	/** Human handle, unique per project. Slashes are plain characters, not folders. */
	@Column({ type: 'varchar', length: 255 })
	name: string;

	/**
	 * Where the file bytes live: 'db' (the `binary_data` table) or a blob-storage
	 * backend ('fs', 's3', 'az'). Bytes are resolved via ProjectFileStore.
	 */
	@Column({ type: 'varchar', length: 2, nullable: false, default: 'fs' })
	storedAt: ExecutionDataStorageLocation;

	/**
	 * Key addressing the bytes within `storedAt`: a `binary_data.fileId` for
	 * 'db', a byte-store key otherwise. Persisted rather than derived, so rows
	 * keep resolving across key-scheme or storage-mode changes. Replace swaps
	 * this to a freshly written key in a single update.
	 */
	@Column({ type: 'text' })
	storageKey: string;

	// mimeType/fileSizeBytes are denormalized rather than joined from storage
	// metadata: fs has no native metadata, and list views must never touch the
	// byte store.
	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	/** Content size in bytes; SUM()'d for the instance-wide storage quota. */
	@Column({ type: 'bigint', transformer: bigintTransformer })
	fileSizeBytes: number;
}
