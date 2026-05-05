import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	Relation,
} from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';
import type { User } from './user';

export type InstanceAiPendingConfirmationKind = 'suspended' | 'inline';

@Entity({ name: 'instance_ai_pending_confirmation' })
export class InstanceAiPendingConfirmation extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	requestId: string;

	@Index()
	@Column({ type: 'uuid' })
	threadId: string;

	@Column({ type: 'varchar', length: 36 })
	userId: string;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: Relation<User>;

	@Column({ type: 'varchar', length: 16 })
	kind: InstanceAiPendingConfirmationKind;

	@Column({ type: 'varchar', length: 64, nullable: true })
	mastraRunId: string | null;

	@Column({ type: 'varchar', length: 64, nullable: true })
	toolCallId: string | null;

	@Column({ type: 'varchar', length: 64 })
	runId: string;

	@Column({ type: 'varchar', length: 64, nullable: true })
	messageGroupId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	checkpointTaskId: string | null;

	@Index()
	@DateTimeColumn()
	expiresAt: Date;
}
