import type { AgentCatalogModel } from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';

type ConfigObj = NonNullable<AgentJsonConfig['config']>;

export function normalizeReasoningForModelChange(
	currentSubConfig: ConfigObj | undefined,
	supportsReasoning: AgentCatalogModel['reasoning'],
): Partial<AgentJsonConfig> {
	if (supportsReasoning !== false || currentSubConfig?.reasoning === undefined) return {};

	const { reasoning: _reasoning, ...restConfig } = currentSubConfig;
	return { config: Object.keys(restConfig).length > 0 ? restConfig : undefined };
}
