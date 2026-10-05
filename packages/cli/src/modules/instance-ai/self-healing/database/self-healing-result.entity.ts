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

import { WorkflowSuggestion } from '../../workflow-suggestions/database/workflow-suggestion.entity';

@Entity('self_healing_result')
@Index(['suggestionId'], { unique: true, where: '"suggestionId" IS NOT NULL' })
export class SelfHealingResult extends WithTimestampsAndStringId {
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

	@Column({ type: 'varchar', length: 2000 })
	summary: string;

	@Column({ type: 'text' })
	report: string;

	@DateTimeColumn()
	completedAt: Date;

	// Execution references can outlive v1 pruning and can point to the v2 data plane.
	@Column({ type: 'varchar', length: 255, nullable: true })
	executionId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	suggestionId: string | null;

	@ManyToOne(() => WorkflowSuggestion, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'suggestionId' })
	suggestion: Relation<WorkflowSuggestion> | null;

	@JsonColumn({ nullable: true })
	usage: SelfHealingResultUsage | null;

	@DateTimeColumn({ nullable: true })
	dismissedAt: Date | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	dismissedById: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'dismissedById' })
	dismissedBy: Relation<User> | null;
}
