import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import { JsonColumn, User, WithTimestamps } from '@n8n/db';
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { InstanceAiThread } from './instance-ai-thread.entity';

/**
 * The tabs a user has open in a thread. Stored apart from the thread row, so a
 * tab change does not update the thread's `updatedAt` and reorder the thread list.
 *
 * Keyed by `(threadId, userId)`, so a future shared thread keeps separate tabs
 * for each participant.
 */
@Entity({ name: 'instance_ai_thread_tabs' })
export class InstanceAiThreadTabs extends WithTimestamps {
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

	@JsonColumn()
	state: InstanceAiThreadTabsState;
}
