import { WithTimestampsAndStringId, type ExecutionDataStorageLocation } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { App } from './app.entity';

@Entity({ name: 'app_version' })
export class AppVersion extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@ManyToOne(() => App)
	@JoinColumn({ name: 'appId' })
	app: Relation<App>;

	@Column()
	@Index()
	appId: string;

	@Column({ type: 'varchar', length: 8 })
	storedAt: ExecutionDataStorageLocation;

	@Column()
	sourceStorageKey: string;

	/** Null once retention pruned the dist tarball; the source tarball stays. */
	@Column({ type: String, nullable: true })
	distStorageKey: string | null;

	@Column({ type: Number, default: 0 })
	sourceSizeBytes: number;

	/** Null once retention pruned the dist tarball, same as {@link distStorageKey}. */
	@Column({ type: Number, nullable: true })
	distSizeBytes: number | null;

	/** Short summary of what changed, set by the AI Assistant after a turn; null when unknown. */
	@Column({ type: String, length: 128, nullable: true })
	label: string | null;
}
