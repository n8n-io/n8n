import type { AppBuildStatus } from '@n8n/api-types';
import { DateTimeColumn, dbType, idStringifier, WithTimestamps, type ScheduledTask } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import type { App } from './app.entity';

@Entity({ name: 'app_version' })
export class AppVersion extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Index()
	@Column({ type: 'uuid' })
	appId: string;

	@ManyToOne('App', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'appId' })
	app: Relation<App>;

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

	@ManyToOne('ScheduledTask', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({
		name: 'buildTaskId',
		foreignKeyConstraintName: 'app_version_buildTaskId_foreign',
	})
	buildTask: Relation<ScheduledTask> | null;

	@Column({ type: 'varchar', length: 32, default: 'queued' })
	buildStatus: AppBuildStatus;
}
