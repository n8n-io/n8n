import { AddDeletedStatusToAgentMemory1793182079956 as BaseMigration } from '../common/1793182079956-AddDeletedStatusToAgentMemory';

/**
 * Memory sources reference both tables with cascading foreign keys. Recreating
 * the tables must not delete those sources, so foreign keys are off.
 */
export class AddDeletedStatusToAgentMemory1793182079956 extends BaseMigration {
	withFKsDisabled = true as const;
}
