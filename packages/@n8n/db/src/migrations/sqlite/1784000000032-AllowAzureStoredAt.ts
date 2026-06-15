import { replaceStoredAtCheck } from '../common/1784000000032-AllowAzureStoredAt';
import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * SQLite variant: widening the `storedAt` CHECK recreates the table, and
 * `execution_entity` has incoming CASCADE FKs, so we run with foreign keys
 * disabled to avoid cascading deletes of execution data/metadata/annotations.
 */
export class AllowAzureStoredAt1784000000032 implements IrreversibleMigration {
	withFKsDisabled = true as const;

	async up(ctx: MigrationContext) {
		await replaceStoredAtCheck(ctx);
	}
}
