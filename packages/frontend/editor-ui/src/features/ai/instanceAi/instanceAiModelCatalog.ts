import type { InstanceAiCatalogModel, InstanceAiModelCatalogResponse } from '@n8n/api-types';

import {
	INSTANCE_AI_RECOMMENDED_MODELS,
	type InstanceAiModelProvider,
} from './instanceAiConnection.constants';

export interface InstanceAiModelOption {
	id: string;
	name: string;
	recommended: boolean;
}

function compareModels(a: InstanceAiCatalogModel, b: InstanceAiCatalogModel): number {
	const aReleaseTime = a.releaseDate ? Date.parse(a.releaseDate) : Number.NaN;
	const bReleaseTime = b.releaseDate ? Date.parse(b.releaseDate) : Number.NaN;
	const aHasReleaseDate = !Number.isNaN(aReleaseTime);
	const bHasReleaseDate = !Number.isNaN(bReleaseTime);

	if (aHasReleaseDate && bHasReleaseDate && aReleaseTime !== bReleaseTime) {
		return bReleaseTime - aReleaseTime;
	}
	if (aHasReleaseDate !== bHasReleaseDate) return aHasReleaseDate ? -1 : 1;

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
	const dynamicModels: InstanceAiCatalogModel[] = catalogModels
		.filter((model) => model.id && model.name && !seen.has(model.id))
		.map((model) => ({ ...model }));
	if (current && !seen.has(current) && !catalogById.has(current)) {
		dynamicModels.push({ id: current, name: current });
	}

	const dynamic = dynamicModels
		.sort(compareModels)
		.map((model) => ({ id: model.id, name: model.name, recommended: false }));

	return [...recommended, ...dynamic];
}
