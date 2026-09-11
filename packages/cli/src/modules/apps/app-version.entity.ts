import type { AppVersionSnapshot } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { App } from './app.entity';

/** A published version of an App: a frozen snapshot of its page tree and theme. */
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

	@Column({ type: 'json' })
	snapshot: AppVersionSnapshot;

	/** User who published this version; null once they are deleted. */
	@Column({ type: String, nullable: true })
	createdById: string | null;
}
