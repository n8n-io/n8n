import type { PreferenceMiningRun, PreferenceMiningRunSummary } from '@n8n/api-types';
import { JsonColumn, WithTimestamps, type User, type Project } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

@Entity('preference_mining_run')
@Index(['userId', 'projectId', 'createdAt', 'id'])
export class PreferenceMiningRunEntity extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column('uuid')
	userId: string;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@JsonColumn()
	summary: PreferenceMiningRunSummary;

	@JsonColumn()
	data: PreferenceMiningRun;
}
