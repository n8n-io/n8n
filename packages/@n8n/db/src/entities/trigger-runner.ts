import { Entity, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';

/**
 * Liveness registry of instances eligible to hold trigger seats. A runner
 * upserts its row on every reconcile tick; a runner whose heartbeat is older
 * than the liveness TTL is treated as gone when computing seat assignments.
 */
@Entity({ name: 'trigger_runner' })
export class TriggerRunner extends WithTimestamps {
	/** The instance's hostId. */
	@PrimaryColumn({ type: 'varchar', length: 255 })
	runnerId: string;

	@DateTimeColumn()
	lastHeartbeatAt: Date;
}
