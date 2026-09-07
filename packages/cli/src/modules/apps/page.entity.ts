import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { App } from './app.entity';

@Entity()
export class Page extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	route: string;

	@Column({ type: 'json', nullable: true })
	content: unknown[] | null;

	@ManyToOne(() => App)
	@JoinColumn({ name: 'appId' })
	app: Relation<App>;

	@Column()
	@Index()
	appId: string;

	@ManyToOne(() => Page, { nullable: true })
	@JoinColumn({ name: 'parentPageId' })
	parentPage: Relation<Page> | null;

	@Column({ nullable: true })
	@Index()
	parentPageId: string | null;

	/** Workflow this page calls to fetch its data. `null` means the page has no data source yet. */
	@Column({ type: String, nullable: true })
	dataWorkflowId: string | null;
}
