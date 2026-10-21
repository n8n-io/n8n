import { CreateSelfHealingConfigurations1792584737484 as BaseMigration } from '../common/1792584737484-CreateSelfHealingConfigurations';

export class CreateSelfHealingConfigurations1792584737484 extends BaseMigration {
	// Rebuilding result and investigation tables must not delete their dependents.
	withFKsDisabled = true as const;
}
