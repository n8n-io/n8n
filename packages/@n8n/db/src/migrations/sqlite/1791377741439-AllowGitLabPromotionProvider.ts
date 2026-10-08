import { AllowGitLabPromotionProvider1791377741439 as BaseMigration } from '../common/1791377741439-AllowGitLabPromotionProvider';

/** The provider table has incoming foreign keys. Keep its dependents during table recreation. */
export class AllowGitLabPromotionProvider1791377741439 extends BaseMigration {
	withFKsDisabled = true as const;
}
