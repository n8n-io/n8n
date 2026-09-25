import type {
	WorkflowSuggestionContent,
	WorkflowSuggestionLifecycleResult,
	WorkflowSuggestionSource,
} from '@n8n/api-types';
import {
	DateTimeColumn,
	JsonColumn,
	Project,
	User,
	WorkflowEntity,
	WithTimestampsAndStringId,
} from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

@Entity('workflow_suggestion')
@Index(['workflowId'], { unique: true, where: "state = 'pending'" })
@Index(['state', 'updatedAt'])
@Index(['state', 'closedAt'])
export class WorkflowSuggestion extends WithTimestampsAndStringId {
	@Index({ unique: true })
	@Column({ type: 'varchar', length: 255 })
	sourceKey: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne(() => WorkflowEntity, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: WorkflowEntity;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Index()
	@Column({ type: 'uuid' })
	backgroundUserId: string;

	@ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'backgroundUserId' })
	backgroundUser: User;

	@JsonColumn()
	expectedBaseline: WorkflowSuggestionSource['expectedBaseline'];

	@Column({ type: 'varchar', length: 16 })
	state: WorkflowSuggestionLifecycleResult['state'];

	@Column({ type: 'int' })
	revision: number;

	@Column({ type: 'int', nullable: true })
	submittedRevision: number | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	closedReason: WorkflowSuggestionLifecycleResult['closedReason'];

	@DateTimeColumn({ nullable: true })
	closedAt: Date | null;

	@JsonColumn({ nullable: true })
	payload: WorkflowSuggestionContent | null;
}
