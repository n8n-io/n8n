import { DateTimeColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

export type ExternalSecretsProviderState = 'connected' | 'tested' | 'initializing' | 'error';

@Entity()
@Index(['name', 'projectId'], { unique: true })
export class ExternalSecretsProvider extends WithTimestampsAndStringId {
	@Column()
	name: string;

	@Column()
	displayName: string;

	@Column()
	type: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'projectId' })
	project: Project | null;

	@Column({ nullable: true })
	projectId: string | null;

	@Column('text')
	settings: string;

	@Column({ default: false })
	connected: boolean;

	@DateTimeColumn({ nullable: true })
	connectedAt: Date | null;

	@Column({ default: 'initializing' })
	state: ExternalSecretsProviderState;
}
