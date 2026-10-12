import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { DateTimeColumn, datetimeColumnType } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

export type UsageKind = 'workflow' | 'agent';

/** Grain of a `usage_by_period` row. Only `day` is written today. */
export type UsagePeriodUnit = 'hour' | 'day' | 'month';

/** The moment a fact records. Only `finished` is written today. */
export type UsagePhase = 'started' | 'finished' | 'refused';

/** Facts about one finished unit of work, apart from its identity. */
abstract class UsageFactBody {
	/** Workflow id or agent id. */
	@Column({ type: 'varchar', length: 36 })
	subjectId: string;

	@Column({ type: 'varchar', length: 128, nullable: true })
	subjectName: string | null;

	/** Project at run time. Null only when the workflow has no owner any more. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	/** Workflow execution mode, or agent message source. */
	@Column({ type: 'varchar', length: 32 })
	trigger: string;

	@Column({ type: 'varchar', length: 16 })
	status: string;

	/** Who started the run on whose behalf, e.g. `instance_ai`. Null for a normal run. */
	@Column({ type: 'varchar', length: 32, nullable: true })
	origin: string | null;

	/** An agent draft or test-session message. Workflows carry this in `trigger = manual`. */
	@Column({ type: 'boolean' })
	isTest: boolean;

	/** Parent execution id of a sub-workflow, or parent thread id of a sub-agent. */
	@Column({ type: 'varchar', length: 128, nullable: true })
	parentId: string | null;

	@DateTimeColumn({ nullable: true })
	startedAt: Date | null;

	/** When this phase happened: the end time for `finished`. */
	@DateTimeColumn()
	occurredAt: Date;
}

/** Queue of facts not folded yet. The fold deletes the rows it takes. */
@Entity({ name: 'usage_event' })
export class UsageEvent extends UsageFactBody {
	/** Postgres returns a bigint as a string, SQLite as a number. Only used to order and delete. */
	@PrimaryGeneratedColumn({ type: 'bigint' })
	id: string | number;

	@Column({ type: 'varchar', length: 16 })
	kind: UsageKind;

	@Column({ type: 'varchar', length: 36 })
	executionId: string;

	@Column({ type: 'varchar', length: 16 })
	phase: UsagePhase;
}

/** One row per execution and phase, so a fact delivered twice is counted once. */
@Entity({ name: 'usage_ledger' })
export class UsageLedgerEntry extends UsageFactBody {
	@PrimaryColumn({ type: 'varchar', length: 16 })
	kind: UsageKind;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	executionId: string;

	@PrimaryColumn({ type: 'varchar', length: 16 })
	phase: UsagePhase;

	@DateTimeColumn()
	foldedAt: Date;
}

export type UsageFact = Omit<UsageEvent, 'id'>;

/** Run counts per project and raw dimensions, per UTC period. Units filter these when read. */
@Entity({ name: 'usage_by_period' })
export class UsageByPeriod {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@PrimaryColumn({ type: 'varchar', length: 16 })
	kind: UsageKind;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	subjectId: string;

	@PrimaryColumn({ type: 'varchar', length: 16 })
	phase: UsagePhase;

	@PrimaryColumn({ type: 'varchar', length: 32 })
	trigger: string;

	@PrimaryColumn({ type: 'varchar', length: 16 })
	status: string;

	/** Empty string for a normal run, since a key column cannot be null. */
	@PrimaryColumn({ type: 'varchar', length: 32 })
	origin: string;

	@PrimaryColumn({ type: 'boolean' })
	isTest: boolean;

	@PrimaryColumn({ type: 'boolean' })
	hasParent: boolean;

	@PrimaryColumn({ type: 'varchar', length: 8 })
	periodUnit: UsagePeriodUnit;

	/** Start of the UTC period. */
	@PrimaryColumn({ type: datetimeColumnType })
	periodStart: Date;

	@Column({ type: 'bigint', transformer: bigintStringToNumber })
	count: number;
}
