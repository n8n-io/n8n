import type { DashboardSpec } from '@n8n/api-types';
import { JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from '@n8n/typeorm';

import { DashboardShare } from './dashboard-share.entity';

@Entity()
@Index(['name', 'projectId'], { unique: true })
export class Dashboard extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@JsonColumn()
	spec: DashboardSpec;

	@JsonColumn({ nullable: true })
	tags: string[] | null;

	@Column({ type: 'boolean', default: false })
	archived: boolean;

	/**
	 * Optimistic-concurrency counter. Bumped on every spec/metadata write.
	 * Clients send `expectedVersion` on PATCH; the controller returns 409 on mismatch.
	 */
	@Column({ type: 'int', default: 1 })
	version: number;

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;

	@OneToMany(
		() => DashboardShare,
		(share) => share.dashboard,
		{
			cascade: true,
		},
	)
	shares: DashboardShare[];
}
