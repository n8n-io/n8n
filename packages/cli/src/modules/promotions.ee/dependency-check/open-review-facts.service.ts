import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { targetKey, type OpenReviewFact, type TargetKey } from './dependency-check.types';
import { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';

/**
 * The open reviews of a promote environment, with the workflows and the credentials that each
 * review adds to the branch. The check uses them for the state "in an open review".
 *
 * Every failure gives no fact: a review that n8n cannot read must not change the result of a
 * check, and "not on the branch" is still true for its targets.
 */
@Service()
export class OpenReviewFactsService {
	constructor(
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	async gather(environmentId: string): Promise<OpenReviewFact[]> {
		try {
			const reviews = await this.reviewRepository.findOpenByEnvironmentId(environmentId);
			if (reviews.length === 0) return [];
			// Loaded here, because the changes service depends on the promotions service, which
			// can depend on the dependency check.
			const { PromotionReviewChangesService } = await import(
				'../promotion-review-changes.service.js'
			);
			const changes = Container.get(PromotionReviewChangesService);
			const facts = await Promise.all(
				reviews.map(async ({ id }): Promise<OpenReviewFact | undefined> => {
					try {
						const { resources } = await changes.getChanges(id);
						const targetKeys = resources.flatMap((resource): TargetKey[] => {
							if (resource.change !== 'added' && resource.change !== 'modified') return [];
							if (resource.type !== 'workflow' && resource.type !== 'credential') return [];
							return [targetKey(resource.type, resource.id)];
						});
						return { reviewId: id, targetKeys };
					} catch (error) {
						this.logger.warn('Could not read the changes of a promotion review', {
							reviewId: id,
							error,
						});
						return undefined;
					}
				}),
			);
			return facts.flatMap((fact) => fact ?? []);
		} catch (error) {
			this.logger.warn('Could not read the open promotion reviews', { environmentId, error });
			return [];
		}
	}
}
