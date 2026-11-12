import type {
	ExecutionLedgerBlockedBy,
	ExecutionLedgerEntityType,
	ExecutionLedgerEvent,
	ExecutionLedgerOrigin,
	ExecutionLedgerOutcome,
} from '@n8n/db';
import { DateTimeColumn, dbType, idStringifier } from '@n8n/db';
import { BaseEntity, Column, Entity, Generated, PrimaryColumn } from '@n8n/typeorm';

/** One start or end of a run. Fold steps read rows as `ExecutionLedgerRow`, never as this class. */
@Entity({ name: 'execution_ledger' })
export class ExecutionLedgerEntity extends BaseEntity {
	@Generated()
	@PrimaryColumn({ type: dbType === 'sqlite' ? 'integer' : 'bigint', transformer: idStringifier })
	id: string;

	@Column({ type: 'varchar', length: 36 })
	executionId: string;

	@DateTimeColumn()
	occurredAt: Date;

	@Column({ type: 'varchar', length: 16 })
	entityType: ExecutionLedgerEntityType;

	@Column({ type: 'varchar', length: 128 })
	entityName: string;

	@Column({ type: 'varchar', length: 36 })
	entityId: string;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 32 })
	mode: string;

	@Column({ type: 'varchar', length: 32, default: 'none' })
	source: string;

	@Column({ type: 'varchar', length: 16 })
	event: ExecutionLedgerEvent;

	@Column({ type: 'varchar', length: 16 })
	outcome: ExecutionLedgerOutcome;

	@Column({ type: 'varchar', length: 32, default: 'none' })
	blockedBy: ExecutionLedgerBlockedBy;

	@Column({ type: 'int', default: 0 })
	runtimeMs: number;

	@Column({ type: 'int', default: 0 })
	timeSavedMin: number;

	@Column({ type: 'varchar', length: 8 })
	origin: ExecutionLedgerOrigin;

	@Column({ type: 'uuid' })
	eventId: string;
}
