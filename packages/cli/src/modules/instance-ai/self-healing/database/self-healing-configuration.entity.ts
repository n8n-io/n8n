import { Project, User, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';

@Entity('self_healing_configuration')
@Index(['projectId'], { unique: true, where: '"scope" = \'all\'' })
export class SelfHealingConfiguration extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Column({ type: 'varchar', length: 16 })
	scope: 'all' | 'selected';

	@Column({ type: 'boolean', default: false })
	enabled: boolean;

	@Column({ type: 'boolean', default: false })
	includeAllProjectMembers: boolean;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	enabledById: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'enabledById' })
	enabledBy: Relation<User> | null;
}
