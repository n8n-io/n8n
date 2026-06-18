import {
	Column,
	Entity,
	Generated,
	Index,
	ManyToOne,
	OneToMany,
	OneToOne,
	PrimaryColumn,
	Relation,
	DeleteDateColumn,
} from '@n8n/typeorm';
import type { SimpleColumnType } from '@n8n/typeorm/driver/types/ColumnTypes';
import { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import { DateTimeColumn, datetimeColumnType, jsonColumnType } from './abstract-entity';
import type { ExecutionAnnotation } from './execution-annotation.ee';
import type { ExecutionData } from './execution-data';
import type { ExecutionMetadata } from './execution-metadata';
import { WorkflowEntity } from './workflow-entity';
import { bigintStringToNumber, idStringifier } from '../utils/transformers';

export type ExecutionDataStorageLocation = 'db' | 'fs' | 's3' | 'az';

@Entity()
@Index(['workflowId', 'id'])
@Index(['waitTill', 'id'])
@Index(['finished', 'id'])
@Index(['workflowId', 'finished', 'id'])
@Index(['workflowId', 'waitTill', 'id'])
// Partial index (Postgres only) — supports paginated list queries filtered by
// workflowId + status without full sequential scans. See migration 1784000000029.
@Index(['workflowId', 'status', 'id'], { where: '"deletedAt" IS NULL' })
export class ExecutionEntity {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	/**
	 * Whether the execution finished successfully.
	 *
	 * @deprecated Use `status` instead
	 */
	@Column()
	finished: boolean;

	@Column('varchar')
	mode: WorkflowExecuteMode;

	@Column({ nullable: true })
	retryOf: string;

	@Column({ nullable: true })
	retrySuccessId: string;

	@Column('varchar')
	status: ExecutionStatus;

	@Column(datetimeColumnType)
	createdAt: Date;

	/**
	 * Time when the processing of the execution actually started. This column
	 * is `null` when an execution is enqueued but has not started yet.
	 */
	@Column({
		type: datetimeColumnType as SimpleColumnType,
		nullable: true,
	})
	startedAt: Date | null;

	@Index()
	@DateTimeColumn({ nullable: true })
	stoppedAt: Date;

	@DeleteDateColumn({ type: datetimeColumnType as SimpleColumnType, nullable: true })
	deletedAt: Date;

	@Column({ nullable: true })
	workflowId: string;

	@DateTimeColumn({ nullable: true })
	waitTill: Date | null;

	/**
	 * Where the execution data is stored at: 'db' (database), 'fs' (filesystem), or 's3'.
	 */
	@Column({ type: 'varchar', length: 2, nullable: false, default: 'db' })
	storedAt: ExecutionDataStorageLocation;

	@Column({ type: jsonColumnType, nullable: true })
	tracingContext: { traceparent: string; tracestate?: string } | null;
	/**
	 * Optional caller-supplied key that uniquely identifies this logical
	 * execution. Enforced unique via an index, so concurrent attempts
	 * with the same key fail on insert and can be skipped instead of
	 * being run twice. `null` when no key is supplied.
	 *
	 * Current use: the Schedule Trigger sets this to the canonical cron
	 * firing time. Future uses may include webhook idempotency keys.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	deduplicationKey: string | null;

	/**
	 * Size in bytes of the serialized execution data bundle (run data, workflow
	 * snapshot, version id) as last persisted; excludes binary data, stored
	 * separately. `0` means not yet calculated — a real bundle is always larger.
	 */
	@Column({ type: 'bigint', default: 0, transformer: bigintStringToNumber })
	jsonSizeBytes: number;

	/**
	 * Size in bytes of the binary data offloaded to separate storage (db/fs/S3),
	 * deduplicated by stored blob. Excludes inline binary from legacy in-memory
	 * executions, which lives in the bundle counted by {@link jsonSizeBytes}, so the
	 * two are additive. `0` means unknown.
	 */
	@Column({ type: 'bigint', default: 0, transformer: bigintStringToNumber })
	binaryDataSizeBytes: number;

	/**
	 * Version id of the workflow this execution ran, denormalized from the data
	 * bundle so it can be queried without loading the bundle. `null` when the
	 * workflow had no version (e.g. unsaved manual executions).
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowVersionId: string | null;

	@OneToMany('ExecutionMetadata', 'execution')
	metadata: ExecutionMetadata[];

	@OneToOne('ExecutionData', 'execution')
	executionData: Relation<ExecutionData>;

	@OneToOne('ExecutionAnnotation', 'execution')
	annotation?: Relation<ExecutionAnnotation>;

	@ManyToOne('WorkflowEntity')
	workflow: WorkflowEntity;
}
