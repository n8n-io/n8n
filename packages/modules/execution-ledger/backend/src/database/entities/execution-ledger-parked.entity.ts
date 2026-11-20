import {
	bigintStringToNumber,
	DateTimeColumn,
	EXECUTION_LEDGER_ENTITY_NAME_MAX_LENGTH,
	idStringifier,
} from '@n8n/db';
import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from '@n8n/typeorm';

/**
 * A ledger row that one fold step could not fold. The enum-like columns are plain strings,
 * because a row with a value that this version does not know is parked too.
 */
@Entity({ name: 'execution_ledger_parked' })
@Index(['step', 'ledgerId'], { unique: true })
export class ExecutionLedgerParkedEntity extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'bigint', transformer: idStringifier })
	ledgerId: string;

	@Column({ type: 'varchar', length: 48 })
	step: string;

	@Column({ type: 'varchar', length: 255 })
	error: string;

	@DateTimeColumn()
	parkedAt: Date;

	@Column({ type: 'varchar', length: 36 })
	executionId: string;

	@DateTimeColumn()
	occurredAt: Date;

	@Column({ type: 'varchar', length: 16 })
	entityType: string;

	@Column({ type: 'varchar', length: EXECUTION_LEDGER_ENTITY_NAME_MAX_LENGTH })
	entityName: string;

	@Column({ type: 'varchar', length: 36 })
	entityId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@Column({ type: 'varchar', length: 32 })
	mode: string;

	@Column({ type: 'varchar', length: 32 })
	source: string;

	@Column({ type: 'varchar', length: 16 })
	event: string;

	@Column({ type: 'varchar', length: 16 })
	outcome: string;

	@Column({ type: 'varchar', length: 32 })
	blockedBy: string;

	@Column({ type: 'bigint', transformer: bigintStringToNumber })
	runtimeMs: number;

	@Column({ type: 'int' })
	timeSavedMin: number;

	@Column({ type: 'varchar', length: 8 })
	origin: string;

	@Column({ type: 'uuid' })
	eventId: string;
}
