import type { InstanceAiModelCatalogResponse } from '@n8n/api-types';

import {
	INSTANCE_AI_RECOMMENDED_MODELS,
	type InstanceAiModelProvider,
} from './instanceAiConnection.constants';

export interface InstanceAiModelOption {
	id: string;
	name: string;
	recommended: boolean;
}

function compareModels(a: InstanceAiModelOption, b: InstanceAiModelOption): number {
	return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

export function getInstanceAiModelOptions(
	provider: InstanceAiModelProvider,
	catalog: InstanceAiModelCatalogResponse['models'] | null,
	currentModel: string,
): InstanceAiModelOption[] {
	if (provider === 'custom') return [];

	const catalogModels = catalog?.[provider] ?? [];
	const catalogById = new Map(catalogModels.map((model) => [model.id, model]));
	const seen = new Set<string>();
	const recommended = INSTANCE_AI_RECOMMENDED_MODELS[provider].map((id, index) => {
		seen.add(id);
		return {
			id,
			name: catalogById.get(id)?.name ?? id,
			recommended: index === 0,
		};
	});

	const current = currentModel.trim();
	const currentOption =
		current && !seen.has(current)
			? {
					id: current,
					name: catalogById.get(current)?.name ?? current,
					recommended: false,
				}
			: null;
	if (currentOption) seen.add(currentOption.id);

	const dynamic = catalogModels
		.filter((model) => model.id && model.name && !seen.has(model.id))
		.map((model) => ({ id: model.id, name: model.name, recommended: false }))
		.sort(compareModels);

	return [...recommended, ...(currentOption ? [currentOption] : []), ...dynamic];
}
