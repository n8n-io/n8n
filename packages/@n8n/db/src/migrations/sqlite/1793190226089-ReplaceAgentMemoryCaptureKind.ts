import { ReplaceAgentMemoryCaptureKind1793190226089 as BaseMigration } from '../common/1793190226089-ReplaceAgentMemoryCaptureKind';

/**
 * Memory sources reference the candidates table with a cascading foreign key.
 * Recreating the table must not delete those sources, so foreign keys are off.
 */
export class ReplaceAgentMemoryCaptureKind1793190226089 extends BaseMigration {
	withFKsDisabled = true as const;
}
