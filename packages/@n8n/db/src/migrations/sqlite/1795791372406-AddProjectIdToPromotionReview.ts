import { AddProjectIdToPromotionReview1795791372406 as BaseMigration } from '../common/1795791372406-AddProjectIdToPromotionReview';

/** `down()` recreates promotion_review on SQLite. `promotion_run.reviewId` points at it, so keep those links. */
export class AddProjectIdToPromotionReview1795791372406 extends BaseMigration {
	withFKsDisabled = true as const;
}
