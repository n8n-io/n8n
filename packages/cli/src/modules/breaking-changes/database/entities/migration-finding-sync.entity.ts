import type { BreakingChangeVersion } from '@n8n/api-types';
import { DateTimeColumn } from '@n8n/db';
import { BaseEntity, Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/**
 * Metadata of the last scan that wrote to `migration_finding`, one row per
 * target version. A changed fingerprint tells the next scan to re-check every workflow.
 */
// Extends `BaseEntity` so the module can register it without timestamp columns.
@Entity({ name: 'migration_finding_sync' })
export class MigrationFindingSync extends BaseEntity {
	@PrimaryColumn({ type: 'varchar', length: 16 })
	targetVersion: BreakingChangeVersion;

	@DateTimeColumn()
	syncedAt: Date;

	/** Hash of the rule ids active during the last scan. */
	@Column({ type: 'varchar', length: 128 })
	ruleSetFingerprint: string;
}
