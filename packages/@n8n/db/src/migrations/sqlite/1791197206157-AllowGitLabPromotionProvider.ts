import { AllowGitLabPromotionProvider1791197206157 as BaseMigration } from '../common/1791197206157-AllowGitLabPromotionProvider';

/** The provider table has incoming foreign keys. Keep them during SQLite table recreation. */
export class AllowGitLabPromotionProvider1791197206157 extends BaseMigration {
	withFKsDisabled = true as const;
}
