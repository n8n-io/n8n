import type { ExecutionDataStorageLocation } from '@n8n/db';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

@Entity({ name: 'app_artifact' })
export class AppArtifact extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 2 })
	storedAt: ExecutionDataStorageLocation;

	@Column({ type: 'text' })
	storageKey: string;

	@Column({ type: 'int' })
	sizeBytes: number;

	@Column({ type: 'varchar', length: 16, default: 'pending' })
	uploadStatus: 'pending' | 'completed';
}
