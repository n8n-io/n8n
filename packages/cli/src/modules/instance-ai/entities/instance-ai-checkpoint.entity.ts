import { DateTimeColumn, JsonColumn, WithTimestamps } from '@n8n/db';
import type { SerializableAgentState } from '@n8n/instance-ai';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { InstanceAiThread } from './instance-ai-thread.entity';

@Entity({ name: 'instance_ai_checkpoints' })
export class InstanceAiCheckpoint extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	key: string;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	runId: string | null;

	/**
	 * The Instance AI (host) run id, distinct from `runId` above (the agent-SDK
	 * id derived from the key). Lets the interrupted-run sweeper match a
	 * crashed run's step checkpoint exactly. Nullable: rows written before the
	 * column existed, and sub-agent checkpoints, don't carry it.
	 */
	@Column({ type: 'varchar', length: 64, nullable: true })
	hostRunId: string | null;

	@ManyToOne(() => InstanceAiThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: InstanceAiThread;

	@Index()
	@Column({ type: 'uuid' })
	threadId: string;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;

	@JsonColumn({ nullable: true })
	state: SerializableAgentState | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	expiredAt: Date | null;
}
