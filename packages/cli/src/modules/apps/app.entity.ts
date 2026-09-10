import type { AppAuth, AppTheme } from '@n8n/api-types';
import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { AppVersion } from './app-version.entity';

@Entity()
@Index(['namespace'], { unique: true })
export class App extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	name: string;

	@Column()
	namespace: string;

	@Column({ type: 'json', nullable: true })
	theme: AppTheme | null;

	@Column({ type: 'varchar', length: 16, default: 'public' })
	auth: AppAuth;

	/** TSX source of the shared components code blocks import from `app/components`. */
	@Column({ type: 'text', nullable: true })
	components: string | null;

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;

	@ManyToOne(() => AppVersion, { nullable: true })
	@JoinColumn({ name: 'activeVersionId' })
	activeVersion: Relation<AppVersion> | null;

	/** The version served at /apps/<namespace>; null means unpublished. */
	@Column({ nullable: true })
	activeVersionId: string | null;
}
