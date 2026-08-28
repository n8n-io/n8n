import { User, WithTimestamps } from '@n8n/db';
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { InstanceAiThread } from './instance-ai-thread.entity';

/**
 * Durable "always allow" grants the user has approved within a thread — e.g.
 * `executions:run` records "execute workflows without re-asking for the rest of
 * this session". Persisting here (rather than in-memory) means a grant survives
 * reload/navigation and is visible across mains.
 *
 * Keyed by `(threadId, userId, grantKey)`: grants are per-user so a future
 * shared thread doesn't leak one participant's approval to another. `grantKey`
 * is a namespaced action string the granting tool owns (e.g. `executions:run`);
 * the namespace leaves room for other gated actions (domain access, etc.) to
 * move onto this table later.
 */
@Entity({ name: 'instance_ai_thread_grants' })
export class InstanceAiThreadGrant extends WithTimestamps {
	// `threadId` is the composite-PK prefix, so it's already indexed for the thread cascade.
	@ManyToOne(() => InstanceAiThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: InstanceAiThread;

	@PrimaryColumn({ type: 'uuid' })
	threadId: string;

	// `userId` isn't the PK prefix, so index it explicitly for the user cascade.
	@Index()
	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User;

	@PrimaryColumn({ type: 'uuid' })
	userId: string;

	// Wide enough for a namespace prefix plus a resource identifier.
	@PrimaryColumn({ type: 'varchar', length: 512 })
	grantKey: string;
}
