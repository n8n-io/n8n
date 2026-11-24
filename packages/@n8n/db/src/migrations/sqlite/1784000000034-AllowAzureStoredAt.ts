import { AllowAzureStoredAt1784000000034 as BaseMigration } from '../common/1784000000034-AllowAzureStoredAt';

/**
 * SQLite variant: widening the `storedAt` CHECK recreates the table, and
 * `execution_entity` has incoming CASCADE FKs, so we run with foreign keys
 * disabled to avoid cascading deletes of execution data/metadata/annotations.
 */
export class AllowAzureStoredAt1784000000034 extends BaseMigration {
	withFKsDisabled = true as const;
}
