import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';

import type { PromotionModel, SubmitPromotionRequest } from '../promotion-model';
import type { Promotion } from '../promotion.entity';
import { PromotionRepository } from '../promotion.repository';

/**
 * Simplest promotion model: only the source instance holds a promotion entity
 * and the server side is a pure state machine. All transport happens in the
 * CLI (`n8n promotion apply`), which exports the unit of work from the source,
 * imports it into the destination, and then marks the promotion promoted. The
 * destination is unaware it participates in a promotion.
 */
@Service()
export class DirectPushModel implements PromotionModel {
	readonly name = 'direct-push';

	private readonly transitions: Record<string, Record<string, string>> = {
		in_review: { approve: 'approved' },
		approved: { 'mark-promoted': 'promoted' },
	};

	constructor(private readonly repository: PromotionRepository) {}

	async submit({ unitOfWork, options }: SubmitPromotionRequest) {
		if (!unitOfWork) throw new UserError('direct-push requires a unitOfWork');
		const promotion = this.repository.create({
			model: this.name,
			role: 'source' as const,
			unitOfWorkType: unitOfWork.type,
			unitOfWorkId: unitOfWork.id,
			state: 'in_review',
			metadata: options,
		});
		return await this.repository.save(promotion);
	}

	availableActions(promotion: Promotion) {
		return Object.keys(this.transitions[promotion.state] ?? {});
	}

	async execute(action: string, promotion: Promotion) {
		const nextState = this.transitions[promotion.state]?.[action];
		if (!nextState) {
			throw new UnexpectedError(
				`No transition for action "${action}" from state "${promotion.state}"`,
			);
		}
		promotion.state = nextState;
		return await this.repository.save(promotion);
	}
}
