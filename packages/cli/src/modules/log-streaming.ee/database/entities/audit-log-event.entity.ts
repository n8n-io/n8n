import { DateTimeColumn, JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/**
 * Debug sink for MessageEventBus events. Populated by the `database` log-streaming
 * destination when N8N_AUDIT_LOG_DB_SINK is enabled. PoC only: unbounded, no pruning.
 */
@Entity({ name: 'audit_log_event' })
export class AuditLogEvent extends WithTimestamps {
	// The originating EventMessage id (uuid); reused so re-delivery is idempotent.
	@PrimaryColumn('varchar')
	id: string;

	@Index()
	@Column('varchar')
	eventName: string;

	@Column('varchar')
	message: string;

	// The event's own timestamp (distinct from createdAt, the ingest time).
	@DateTimeColumn()
	ts: Date;

	@JsonColumn({ nullable: true })
	payload: unknown;
}
