import { AddSelfHealingContinuation1792334990739 as BaseMigration } from '../common/1792334990739-AddSelfHealingContinuation';

export class AddSelfHealingContinuation1792334990739 extends BaseMigration {
	// Rebuilding results must preserve their suggestions and activity.
	withFKsDisabled = true as const;
}
