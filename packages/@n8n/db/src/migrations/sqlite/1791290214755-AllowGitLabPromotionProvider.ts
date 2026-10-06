import { AllowGitLabPromotionProvider1791290214755 as BaseMigration } from '../common/1791290214755-AllowGitLabPromotionProvider';

/** The provider table has incoming foreign keys. Keep its dependents during table recreation. */
export class AllowGitLabPromotionProvider1791290214755 extends BaseMigration {
	withFKsDisabled = true as const;
}
