import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { PromotionModel } from './promotion-model';

@Service()
export class PromotionModelRegistry {
	private readonly models = new Map<string, PromotionModel>();

	register(model: PromotionModel) {
		this.models.set(model.name, model);
	}

	get(name: string): PromotionModel {
		const model = this.models.get(name);
		if (!model) {
			const registered = [...this.models.keys()].join(', ') || 'none';
			throw new UserError(`Unknown promotion model "${name}". Registered models: ${registered}`);
		}
		return model;
	}
}
