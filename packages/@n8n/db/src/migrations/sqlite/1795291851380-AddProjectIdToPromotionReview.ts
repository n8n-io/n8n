import { AddProjectIdToPromotionReview1795291851380 as BaseMigration } from '../common/1795291851380-AddProjectIdToPromotionReview';

/** `down()` recreates promotion_review on SQLite. `promotion_run.reviewId` points at it, so keep those links. */
export class AddProjectIdToPromotionReview1795291851380 extends BaseMigration {
	withFKsDisabled = true as const;
}
