import { BadRequestError } from '@n8n/errors';

export class PromotionReviewCommitsMissingError extends BadRequestError {
	constructor() {
		super('The remote no longer has the commits of this review. Open the review on the Git host.');
	}
}
