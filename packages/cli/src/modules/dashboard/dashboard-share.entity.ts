import { User, WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { Dashboard } from './dashboard.entity';

export type DashboardShareRoleSlug = 'viewer' | 'editor';

@Entity()
export class DashboardShare extends WithTimestamps {
	@PrimaryColumn()
	dashboardId: string;

	@ManyToOne(
		() => Dashboard,
		(dashboard) => dashboard.shares,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'dashboardId' })
	dashboard: Dashboard;

	@PrimaryColumn()
	userId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User;

	@Column({ type: 'varchar', length: 32 })
	role: DashboardShareRoleSlug;
}
