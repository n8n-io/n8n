import type {
	InstanceAiLearningRunStage,
	InstanceAiLearningRunStatus,
	InstanceAiWorkflowObservationDocument,
} from '@n8n/api-types';
import { JsonColumn, Project, User, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_learning_runs' })
@Index(['projectId', 'createdAt'])
export class InstanceAiLearningRun extends WithTimestampsAndStringId {
	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'createdById' })
	createdBy: User;

	@Column({ type: 'uuid' })
	createdById: string;

	@Column({ type: 'varchar', length: 16 })
	status: InstanceAiLearningRunStatus;

	@Column({ type: 'varchar', length: 16 })
	stage: InstanceAiLearningRunStage;

	@JsonColumn()
	workflowIds: string[];

	@JsonColumn({ nullable: true })
	observations: InstanceAiWorkflowObservationDocument[] | null;

	@Column({ type: 'int' })
	totalWorkflows: number;

	@Column({ type: 'int', default: 0 })
	completedWorkflows: number;

	@Column({ type: 'text', nullable: true })
	error: string | null;
}
