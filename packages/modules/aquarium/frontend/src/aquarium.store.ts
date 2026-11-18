import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

import type { AquariumEntity, EntitySource, MetricsSource } from './aquarium.types';
import { demoEntitySources, liveEntitySources, liveMetricsSources } from './sources';
import { loadFromSources } from './sources/source.utils';

export interface AquariumLoadOptions {
	demo?: boolean;
}

export const useAquariumStore = defineStore('aquarium', () => {
	const rootStore = useRootStore();

	const entities = shallowRef<AquariumEntity[]>([]);
	const failedSources = ref<string[]>([]);
	/** True when a whole kind of data is missing. One failed source is normal: most need a license. */
	const isPartial = ref(false);
	const isLoading = ref(false);
	const hasLoaded = ref(false);

	async function load(options: AquariumLoadOptions = {}): Promise<void> {
		const entitySources: EntitySource[] = options.demo ? demoEntitySources : liveEntitySources;
		const metricsSources: MetricsSource[] = options.demo ? [] : liveMetricsSources;

		isLoading.value = true;
		try {
			const result = await loadFromSources(
				{ restApiContext: rootStore.restApiContext },
				entitySources,
				metricsSources,
			);
			entities.value = result.entities;
			failedSources.value = result.failedSources;
			const failed = new Set(result.failedSources);
			const allFailed = (sources: Array<{ id: string }>) =>
				sources.length > 0 && sources.every((source) => failed.has(source.id));
			isPartial.value = allFailed(entitySources) || allFailed(metricsSources);
			hasLoaded.value = true;
		} finally {
			isLoading.value = false;
		}
	}

	return { entities, failedSources, isPartial, isLoading, hasLoaded, load };
});
