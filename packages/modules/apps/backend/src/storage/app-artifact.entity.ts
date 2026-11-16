import { WithTimestamps, type ExecutionDataStorageLocation } from '@n8n/db';
import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

@Entity({ name: 'app_artifact' })
export class AppArtifact extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'uuid',
		comment:
			'No foreign key so the owning app ID remains available for cleanup after app deletion.',
	})
	appId: string;

	@Column({ type: 'varchar', length: 2 })
	storedAt: ExecutionDataStorageLocation;

	@Column({ type: 'text' })
	storageKey: string;

	@Column({ type: 'int' })
	sizeBytes: number;

	@Column({ type: 'varchar', length: 16, default: 'pending' })
	uploadStatus: 'pending' | 'completed';
}

export type AppArtifactRef = Pick<AppArtifact, 'id' | 'appId' | 'storageKey'>;
