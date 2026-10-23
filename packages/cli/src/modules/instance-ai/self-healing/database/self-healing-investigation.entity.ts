import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import {
	DateTimeColumn,
	JsonColumn,
	Project,
	User,
	WorkflowEntity,
	WithTimestampsAndStringId,
} from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { SelfHealingResult } from './self-healing-result.entity';

@Entity('self_healing_investigation')
@Index(['workflowId', 'executionId'], { unique: true })
@Index(['workflowId'], { unique: true, where: '"finishedAt" IS NULL' })
@Index(['resultId'], { unique: true, where: '"resultId" IS NOT NULL' })
export class SelfHealingInvestigation extends WithTimestampsAndStringId {
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

	@Column({ type: 'varchar', length: 36 })
	executionId: string;

	@Column({ type: 'uuid' })
	threadId: string;

	@Column({ type: 'uuid' })
	runId: string;

	@JsonColumn()
	baseline: WorkflowSuggestionBaseline;

	@Column({ type: 'varchar', length: 36, nullable: true })
	resultId: string | null;

	@ManyToOne(() => SelfHealingResult, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'resultId' })
	result: Relation<SelfHealingResult> | null;

	@DateTimeColumn({ nullable: true })
	finishedAt: Date | null;
}
