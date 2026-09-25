import type { WorkflowSuggestionContent, WorkflowSuggestionBaseline } from '@n8n/api-types';
import {
	DateTimeColumn,
	JsonColumn,
	Project,
	User,
	WorkflowEntity,
	WithTimestampsAndStringId,
} from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

@Entity('workflow_suggestion')
@Index(['workflowId'], { unique: true, where: "state = 'pending'" })
@Index(['state', 'closedAt'])
export class WorkflowSuggestion extends WithTimestampsAndStringId {
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

	@JsonColumn()
	expectedBaseline: WorkflowSuggestionBaseline['expectedBaseline'];

	@Column({ type: 'varchar', length: 16 })
	state: 'pending' | 'closed';

	@Column({ type: 'varchar', length: 16, nullable: true })
	closedReason: 'outdated' | 'applied' | 'discarded' | null;

	@DateTimeColumn({ nullable: true })
	closedAt: Date | null;

	@JsonColumn()
	payload: WorkflowSuggestionContent;
}
