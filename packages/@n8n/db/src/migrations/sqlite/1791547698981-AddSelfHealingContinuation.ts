import { AddSelfHealingContinuation1791547698981 as BaseMigration } from '../common/1791547698981-AddSelfHealingContinuation';

export class AddSelfHealingContinuation1791547698981 extends BaseMigration {
	// Thread table recreation must preserve its messages and other referencing rows.
	withFKsDisabled = true as const;
}
