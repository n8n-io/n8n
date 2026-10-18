import { CreateSelfHealingConfigurations1792250412594 as BaseMigration } from '../common/1792250412594-CreateSelfHealingConfigurations';

export class CreateSelfHealingConfigurations1792250412594 extends BaseMigration {
	// Rebuilding result and investigation tables must not delete their dependents.
	withFKsDisabled = true as const;
}
