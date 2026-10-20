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

/**
 * Whether the model's credential resolves through the AI gateway: the host
 * stamps `gatewayManaged: true` on the config when it mints a gateway
 * credential. Only these models keep a provider-reported `usage.cost`; every
 * other model is priced from the catalog estimate.
 */
export function isGatewayManagedModel(model: ModelConfig): boolean {
	return (
		typeof model === 'object' &&
		model !== null &&
		'gatewayManaged' in model &&
		(model as { gatewayManaged?: unknown }).gatewayManaged === true
	);
}
