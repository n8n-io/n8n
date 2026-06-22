import type { Agent, ModelConfig } from '@n8n/agents';
import { PROVIDER_CAPABILITIES } from '@n8n/api-types';

function resolveModelId(modelId: ModelConfig): string | undefined {
	if (typeof modelId === 'string') return modelId;
	if (typeof modelId === 'object' && modelId !== null && 'id' in modelId) {
		return typeof modelId.id === 'string' ? modelId.id : undefined;
	}
	if (
		typeof modelId === 'object' &&
		modelId !== null &&
		'provider' in modelId &&
		'modelId' in modelId
	) {
		const provider = typeof modelId.provider === 'string' ? modelId.provider : undefined;
		const model = typeof modelId.modelId === 'string' ? modelId.modelId : undefined;
		return provider && model ? `${provider}/${model}` : undefined;
	}
	return undefined;
}

function resolveModelProvider(modelId: ModelConfig): string | undefined {
	const id = resolveModelId(modelId);
	if (!id) return undefined;
	const slashIndex = id.indexOf('/');
	return slashIndex > 0 ? id.slice(0, slashIndex) : undefined;
}

export function applyAgentThinking(agent: Agent, modelId: ModelConfig): void {
	const provider = resolveModelProvider(modelId);

	if (!provider || !PROVIDER_CAPABILITIES[provider]?.thinking) return;

	if (provider === 'openai') {
		agent.thinking('openai', { reasoningEffort: 'high' });
		return;
	}

	if (provider === 'anthropic') {
		agent.thinking('anthropic', { mode: 'adaptive' });
		return;
	}
}
