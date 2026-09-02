import type { ModelConfig } from '../types/sdk/agent';

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
