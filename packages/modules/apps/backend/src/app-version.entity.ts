import type { AppBuildStatus } from '@n8n/api-types';
import { DateTimeColumn, dbType, idStringifier, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'app_version' })
export class AppVersion extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'uuid' })
	appId: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	label: string | null;

	@Column({ type: 'text' })
	sourceStorageRef: string;

	@Column({ type: 'int' })
	sourceSizeBytes: number;

	@Column({ type: 'text', nullable: true })
	artifactStorageRef: string | null;

	@Column({ type: 'int', nullable: true })
	artifactSizeBytes: number | null;

	@DateTimeColumn({ nullable: true, precision: 3 })
	artifactPrunedAt: Date | null;

	@Index()
	@Column({
		type: dbType === 'sqlite' ? 'integer' : 'bigint',
		nullable: true,
		transformer: {
			...idStringifier,
			from: (value: number | null) => (value === null ? null : idStringifier.from(value)),
		},
	})
	buildTaskId: string | null;

	@Column({ type: 'varchar', length: 32, default: 'queued' })
	buildStatus: AppBuildStatus;
}
