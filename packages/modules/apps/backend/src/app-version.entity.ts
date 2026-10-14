import type { AppBuildStatus } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
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

	@Column({ type: 'varchar', length: 32, default: 'queued' })
	buildStatus: AppBuildStatus;

	@Column({ type: 'text', nullable: true })
	buildDiagnostics: string | null;
}
