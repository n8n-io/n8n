import { CreateSelfHealingConfigurations1792681078631 as BaseMigration } from '../common/1792681078631-CreateSelfHealingConfigurations';

export class CreateSelfHealingConfigurations1792681078631 extends BaseMigration {
	// Rebuilding result and investigation tables must not delete their dependents.
	withFKsDisabled = true as const;
}
