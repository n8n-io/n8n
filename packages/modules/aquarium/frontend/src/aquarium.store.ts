import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

import { ACTIVITY_POLL_MS } from './aquarium.constants';
import type {
	ActivitySnapshot,
	AquariumEntity,
	EntitySource,
	MetricsSource,
} from './aquarium.types';
import { demoEntitySources, liveEntitySources, liveMetricsSources } from './sources';
import { fetchActivity } from './sources/activity.source';
import { demoActivity } from './sources/demo-activity';
import { loadFromSources } from './sources/source.utils';

export interface AquariumLoadOptions {
	demo?: boolean;
}

const EMPTY_ACTIVITY: ActivitySnapshot = { windowSeconds: 0, byKey: new Map() };

export const useAquariumStore = defineStore('aquarium', () => {
	const rootStore = useRootStore();

	const entities = shallowRef<AquariumEntity[]>([]);
	const failedSources = ref<string[]>([]);
	/** True when a whole kind of data is missing. One failed source is normal: most need a license. */
	const isPartial = ref(false);
	const isLoading = ref(false);
	const hasLoaded = ref(false);

	const activity = shallowRef<ActivitySnapshot>(EMPTY_ACTIVITY);
	const hasActivityError = ref(false);
	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	let pollGeneration = 0;

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

	/** Keeps the last snapshot when a poll fails, so creatures do not flicker on a network error. */
	async function refreshActivity(options: AquariumLoadOptions = {}): Promise<void> {
		if (options.demo) {
			activity.value = demoActivity(entities.value, Date.now());
			hasActivityError.value = false;
			return;
		}
		try {
			activity.value = await fetchActivity({ restApiContext: rootStore.restApiContext });
			hasActivityError.value = false;
		} catch {
			hasActivityError.value = true;
		}
	}

	/** Polls while the page is open. Skips polls while the browser tab is hidden. */
	function startLiveUpdates(options: AquariumLoadOptions = {}): void {
		stopLiveUpdates();
		const generation = ++pollGeneration;

		const tick = async () => {
			if (document.visibilityState !== 'hidden') await refreshActivity(options);
			// A newer start or a stop happened during the request.
			if (generation !== pollGeneration) return;
			pollTimer = setTimeout(tick, ACTIVITY_POLL_MS);
		};
		void tick();
	}

	function stopLiveUpdates(): void {
		pollGeneration++;
		clearTimeout(pollTimer);
		pollTimer = undefined;
		activity.value = EMPTY_ACTIVITY;
	}

	return {
		entities,
		failedSources,
		isPartial,
		isLoading,
		hasLoaded,
		activity,
		hasActivityError,
		load,
		refreshActivity,
		startLiveUpdates,
		stopLiveUpdates,
	};
});
