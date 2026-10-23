import { splitModelId } from '@n8n/ai-utilities/agent-config';
import type { ModelConfig } from '@n8n/instance-ai';

/**
 * Replaces the model name in a `provider/model` config and keeps the provider
 * and credentials. An id without a provider gets `custom/`. Returns `undefined`
 * for a pre-built language model, which has no id to replace.
 *
 * With `dropMainProviderPrefix`, the name is read like `N8N_INSTANCE_AI_MODEL`
 * (see `modelNameForProvider`).
 */
export function withModelName(
	config: ModelConfig,
	modelName: string,
	{ dropMainProviderPrefix = false }: { dropMainProviderPrefix?: boolean } = {},
): ModelConfig | undefined {
	const nameFor = (provider: string) =>
		dropMainProviderPrefix ? modelNameForProvider(modelName, provider) : modelName;
	if (typeof config === 'string') {
		const provider = splitModelId(config).provider || 'custom';
		return `${provider}/${nameFor(provider)}`;
	}
	if (!('kind' in config)) return undefined;
	switch (config.kind) {
		case 'vertex-anthropic':
			return { ...config, id: `google-vertex-anthropic/${nameFor('google-vertex-anthropic')}` };
		case 'endpoint': {
			const provider = splitModelId(config.id).provider || 'custom';
			return { ...config, id: `${provider}/${nameFor(provider)}` };
		}
	}
}

/**
 * Reads a model value like `N8N_INSTANCE_AI_MODEL`: a `provider/` prefix that
 * matches the main model's provider is dropped. Any other value is the provider's
 * own model name, for example `anthropic/claude-haiku-4.5` on OpenRouter.
 */
export function modelNameForProvider(value: string, mainProvider: string): string {
	const { provider, model } = splitModelId(value);
	return provider && provider === mainProvider ? model : value;
}
