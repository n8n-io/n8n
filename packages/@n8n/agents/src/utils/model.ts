import type { ModelConfig } from '../types/sdk/agent';

export function modelConfigToId(modelConfig: ModelConfig): string | undefined {
	if (typeof modelConfig === 'string') return modelConfig;
	if (typeof modelConfig === 'object' && modelConfig !== null && 'id' in modelConfig) {
		return typeof modelConfig.id === 'string' ? modelConfig.id : undefined;
	}
	if (
		typeof modelConfig === 'object' &&
		modelConfig !== null &&
		'provider' in modelConfig &&
		'modelId' in modelConfig
	) {
		const provider = typeof modelConfig.provider === 'string' ? modelConfig.provider : undefined;
		const modelId = typeof modelConfig.modelId === 'string' ? modelConfig.modelId : undefined;
		return provider && modelId ? `${provider}/${modelId}` : undefined;
	}
	return undefined;
}

/**
 * The catalog id for cost and capability lookups. A Microsoft Foundry
 * deployment is user-named, so its config carries the id of the model it
 * serves (`catalogModelId`). Every other model uses its own id.
 */
export function getCatalogModelId(model: ModelConfig): string {
	if (
		typeof model === 'object' &&
		'catalogModelId' in model &&
		typeof model.catalogModelId === 'string'
	) {
		return model.catalogModelId;
	}
	return getModelIdString(model);
}

/** Resolve a model config to its canonical `provider/model` id string. */
export function getModelIdString(model: ModelConfig): string {
	if (typeof model === 'string') return model;
	if ('id' in model && typeof model.id === 'string') return model.id;
	if ('modelId' in model && typeof model.modelId === 'string') {
		const rawProvider = 'provider' in model ? String(model.provider) : 'unknown';
		const provider = rawProvider.split('.')[0];
		return `${provider}/${model.modelId}`;
	}
	return 'unknown';
}
