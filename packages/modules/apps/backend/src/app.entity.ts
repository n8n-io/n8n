import type { AppAuth } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import type { Project } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import type { AppVersion } from './app-version.entity';

@Entity({ name: 'app' })
@Index(['namespace'], { unique: true })
export class App extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 128 })
	namespace: string;

	@Column({ type: 'varchar', length: 32, default: 'n8n' })
	auth: AppAuth;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	draftVersionId: string | null;

	@ManyToOne('AppVersion', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'draftVersionId', foreignKeyConstraintName: 'app_draftVersionId_foreign' })
	draftVersion: Relation<AppVersion> | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	publishedVersionId: string | null;

	@ManyToOne('AppVersion', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({
		name: 'publishedVersionId',
		foreignKeyConstraintName: 'app_publishedVersionId_foreign',
	})
	publishedVersion: Relation<AppVersion> | null;
}
