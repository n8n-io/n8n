import { BadRequestError } from '@n8n/errors';

export class PromotionReviewCommitsMissingError extends BadRequestError {
	constructor() {
		super("n8n can't read the commits of this review. Open the review on the Git host.");
	}
}
