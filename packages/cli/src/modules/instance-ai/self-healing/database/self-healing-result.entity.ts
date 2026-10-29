import type { SelfHealingResultOutcome, SelfHealingResultUsage } from '@n8n/api-types';
import {
	DateTimeColumn,
	JsonColumn,
	Project,
	User,
	WorkflowEntity,
	WithTimestampsAndStringId,
} from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { SelfHealingConfiguration } from './self-healing-configuration.entity';

@Entity('self_healing_result')
export class SelfHealingResult extends WithTimestampsAndStringId {
	@Index()
	@Column({ type: 'int' })
	configurationId: number;

	@ManyToOne(() => SelfHealingConfiguration, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'configurationId' })
	configuration: Relation<SelfHealingConfiguration>;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne(() => WorkflowEntity, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Index()
	@Column({ type: 'uuid' })
	backgroundUserId: string;

	@ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'backgroundUserId' })
	backgroundUser: Relation<User>;

	@Column({ type: 'varchar', length: 16 })
	outcome: SelfHealingResultOutcome;

	@Column({ type: 'text' })
	summary: string;

	@Column({ type: 'text' })
	report: string;

	@DateTimeColumn()
	completedAt: Date;

	// Execution references can outlive v1 pruning and can point to the v2 data plane.
	@Column({ type: 'varchar', length: 36 })
	executionId: string;

	@JsonColumn()
	usage: SelfHealingResultUsage;

	@DateTimeColumn({ nullable: true })
	dismissedAt: Date | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	dismissedById: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'dismissedById' })
	dismissedBy: Relation<User> | null;
}
