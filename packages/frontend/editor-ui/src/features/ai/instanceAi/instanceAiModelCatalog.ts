import {
	INSTANCE_AI_CATALOG_PROVIDERS,
	type InstanceAiCatalogModel,
	type InstanceAiCatalogProvider,
	type InstanceAiModelCatalogResponse,
} from '@n8n/api-types';

import {
	INSTANCE_AI_CURATED_MODELS,
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

function getOptionsForProviders(
	providers: readonly InstanceAiCatalogProvider[],
	catalog: InstanceAiModelCatalogResponse['models'] | null,
	currentModel: string,
): InstanceAiModelOption[] {
	const catalogModels = providers.flatMap((provider) => catalog?.[provider] ?? []);
	const catalogById = new Map<string, InstanceAiCatalogModel>();
	for (const model of catalogModels) {
		if (!catalogById.has(model.id)) catalogById.set(model.id, model);
	}

	const seen = new Set<string>();
	const recommended: InstanceAiModelOption[] = [];
	for (const [providerIndex, provider] of providers.entries()) {
		for (const [modelIndex, id] of INSTANCE_AI_CURATED_MODELS[provider].entries()) {
			if (seen.has(id)) continue;
			seen.add(id);
			recommended.push({
				id,
				name: catalogById.get(id)?.name ?? id,
				recommended: providerIndex === 0 && modelIndex === 0,
			});
		}
	}

	const dynamicModels: InstanceAiCatalogModel[] = catalogModels
		.filter((model) => {
			if (!model.id || !model.name || seen.has(model.id)) return false;
			seen.add(model.id);
			return true;
		})
		.map((model) => ({ ...model }));
	const current = currentModel.trim();
	if (current && !seen.has(current)) dynamicModels.push({ id: current, name: current });

	const dynamic = dynamicModels
		.sort(compareModels)
		.map((model) => ({ id: model.id, name: model.name, recommended: false }));

	return [...recommended, ...dynamic];
}

export function getInstanceAiModelOptions(
	provider: InstanceAiModelProvider,
	catalog: InstanceAiModelCatalogResponse['models'] | null,
	currentModel: string,
): InstanceAiModelOption[] {
	if (provider === 'custom') return [];
	return getOptionsForProviders([provider], catalog, currentModel);
}

export function getAllInstanceAiModelOptions(
	catalog: InstanceAiModelCatalogResponse['models'] | null,
	currentModel: string,
): InstanceAiModelOption[] {
	return getOptionsForProviders(INSTANCE_AI_CATALOG_PROVIDERS, catalog, currentModel);
}
