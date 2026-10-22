import type { ProviderModel } from '@n8n/ai-utilities/model-discovery';

export interface ModelChoice {
	name: string;
	value: string;
	/** Pickers list models with a priority first, highest first. Only the AI Gateway reports one. */
	priority?: number;
	metadata?: ProviderModel['metadata'];
}
