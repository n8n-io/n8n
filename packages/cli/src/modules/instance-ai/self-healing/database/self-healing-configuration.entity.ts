import type {
	SelfHealingAgentGoal,
	SelfHealingAgentPublicationMode,
	SelfHealingAgentScope,
} from '@n8n/api-types';
import { JsonColumn, Project, User, WithTimestamps } from '@n8n/db';
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
@Index(['projectId'], { unique: true, where: '"agentScope" = \'all\'' })
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

	@Column({ type: 'boolean', default: false })
	includeSubWorkflows: boolean;

	@Column({ type: 'varchar', length: 16, default: 'none' })
	agentScope: SelfHealingAgentScope;

	/** The aims of an investigation, in the stored order. The first one is `quality`. */
	@JsonColumn({ default: '["quality"]' })
	agentGoals: SelfHealingAgentGoal[];

	// A null trigger is off. A configuration that covers agents has one trigger or both.
	@Column({ type: 'int', nullable: true })
	agentScheduleIntervalHours: number | null;

	@Column({ type: 'int', nullable: true })
	agentTraceThreshold: number | null;

	@Column({ type: 'varchar', length: 16, default: 'approval' })
	agentPublicationMode: SelfHealingAgentPublicationMode;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	enabledById: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'enabledById' })
	enabledBy: Relation<User> | null;
}
