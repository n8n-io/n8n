import type {
	InstanceAiLearningEvidence,
	InstanceAiLearningKind,
	InstanceAiLearningReviewStatus,
	InstanceAiLearningSensitivity,
} from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, Project, User, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { InstanceAiLearningRun } from './instance-ai-learning-run.entity';

@Entity({ name: 'instance_ai_learnings' })
@Index(['projectId', 'reviewStatus', 'enabled'])
export class InstanceAiLearning extends WithTimestampsAndStringId {
	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => InstanceAiLearningRun, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'runId' })
	run: InstanceAiLearningRun;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	runId: string;

	@Column({ type: 'text' })
	statement: string;

	@Column({ type: 'varchar', length: 32 })
	kind: InstanceAiLearningKind;

	@Column({ type: 'text' })
	appliesWhen: string;

	@Column({ type: 'double precision' })
	confidence: number;

	@Column({ type: 'varchar', length: 16 })
	sensitivity: InstanceAiLearningSensitivity;

	@Column({ type: 'text' })
	transferability: string;

	@JsonColumn()
	evidence: InstanceAiLearningEvidence;

	@Column({ type: 'varchar', length: 16, default: 'pending' })
	reviewStatus: InstanceAiLearningReviewStatus;

	@Column({ type: 'boolean', default: false })
	enabled: boolean;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'reviewedById' })
	reviewedBy: User | null;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	reviewedById: string | null;

	@DateTimeColumn({ nullable: true })
	reviewedAt: Date | null;
}
