import type { AiGatewayModelCategoryResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';

import {
	MODEL_CATEGORIES,
	MODEL_CATEGORY_INFO,
	MODEL_CATEGORY_MAP,
	resolveModel,
	type ModelCategory,
} from './ai-gateway.constants';

@Service()
export class AiGatewayModelService {
	resolveModel(modelOrCategory: string): string {
		return resolveModel(modelOrCategory);
	}

	isCategory(value: string): value is ModelCategory {
		return MODEL_CATEGORIES.includes(value as ModelCategory);
	}

	getCategories(): AiGatewayModelCategoryResponse[] {
		return MODEL_CATEGORY_INFO;
	}

	getCategoryMap(): Record<ModelCategory, string> {
		return { ...MODEL_CATEGORY_MAP };
	}
}
