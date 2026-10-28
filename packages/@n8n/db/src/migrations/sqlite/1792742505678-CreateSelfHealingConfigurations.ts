import { CreateSelfHealingConfigurations1792742505678 as BaseMigration } from '../common/1792742505678-CreateSelfHealingConfigurations';

export class CreateSelfHealingConfigurations1792742505678 extends BaseMigration {
	// Rebuilding result and investigation tables must not delete their dependents.
	withFKsDisabled = true as const;
}
