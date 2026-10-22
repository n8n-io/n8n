import { AllowDeletedAgentMemoryEntryStatus1792694961350 as BaseMigration } from '../common/1792694961350-AllowDeletedAgentMemoryEntryStatus';

/**
 * `agents_memory_entries` has incoming cascading foreign keys from its sources.
 * Recreating it must not delete their rows, so foreign keys are off for this migration.
 */
export class AllowDeletedAgentMemoryEntryStatus1792694961350 extends BaseMigration {
	withFKsDisabled = true as const;
}
