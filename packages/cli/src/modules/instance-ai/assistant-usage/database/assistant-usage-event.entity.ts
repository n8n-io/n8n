import { Project, User, WithCreatedAt } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from '@n8n/typeorm';

export type AssistantUsageEventType =
	| 'message'
	| 'workflow-created'
	| 'agent-created'
	| 'data-table-created'
	| 'token-usage';

/**
 * A message that a user sent to the n8n Assistant, a resource that the
 * Assistant created, or the tokens that its model calls used. The row outlives
 * the thread and the resource.
 */
@Entity({ name: 'assistant_usage_event' })
@Index(['createdAt'])
@Index(['projectId', 'createdAt'])
@Index(['type', 'resourceId'], { unique: true, where: '"resourceId" IS NOT NULL' })
export class AssistantUsageEvent extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 32 })
	type: AssistantUsageEventType;

	@Index()
	@Column({ type: 'uuid', nullable: true })
	userId: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'userId' })
	user?: Relation<User> | null;

	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'projectId' })
	project?: Relation<Project> | null;

	@Column({ type: 'varchar', length: 64, nullable: true })
	resourceId: string | null;

	/** The token columns are set only on `token-usage` rows. */
	@Column({ type: 'varchar', length: 128, nullable: true })
	model: string | null;

	/** Input tokens, cache reads and writes included. */
	@Column({ type: 'int', nullable: true })
	inputTokens: number | null;

	@Column({ type: 'int', nullable: true })
	outputTokens: number | null;

	@Column({ type: 'int', nullable: true })
	cacheReadTokens: number | null;

	@Column({ type: 'int', nullable: true })
	cacheWriteTokens: number | null;
}
