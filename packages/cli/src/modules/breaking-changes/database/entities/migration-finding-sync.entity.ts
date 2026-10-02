import type { BreakingChangeVersion } from '@n8n/api-types';
import { DateTimeColumn } from '@n8n/db';
import { BaseEntity, Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/**
 * `running` while a main scans, `complete` after a full write, `failed` after
 * a run that stopped early. Only a `complete` record makes a version fresh.
 */
export type MigrationFindingSyncStatus = 'running' | 'complete' | 'failed';

/**
 * State of the full sync per target version, one row each. The row is also the
 * cross-main lock: a main claims it before it scans, so only one scan writes at a
 * time. A changed fingerprint tells the next read to re-check every workflow.
 */
// Extends `BaseEntity` so the module can register it without timestamp columns.
@Entity({ name: 'migration_finding_sync' })
export class MigrationFindingSync extends BaseEntity {
	@PrimaryColumn({ type: 'varchar', length: 16 })
	targetVersion: BreakingChangeVersion;

	@Column({ type: 'varchar', length: 16, default: 'complete' })
	status: MigrationFindingSyncStatus;

	/** When the current or last run claimed the record. `null` for rows written before claims existed. */
	@DateTimeColumn({ nullable: true })
	startedAt: Date | null;

	/** When the last complete run finished. `null` until a run completes. */
	@DateTimeColumn({ nullable: true })
	syncedAt: Date | null;

	/** Hash of the rule ids the current or last run checked. */
	@Column({ type: 'varchar', length: 128 })
	ruleSetFingerprint: string;
}
