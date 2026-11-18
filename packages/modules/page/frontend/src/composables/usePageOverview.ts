import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { usePageStore } from '../page.store';

/**
 * Checks the time between two quiet reloads.
 * @throws {RangeError} when the value is not a positive integer
 */
function toRefreshIntervalMs(value: number): number {
	if (!Number.isInteger(value) || value <= 0) {
		throw new RangeError('The refresh interval of the overview must be a positive integer');
	}
	return value;
}

/**
 * Loads the documentation overview of a project. No project means every readable project.
 * `isLoading` is true only while a first load runs. `refresh` reloads without a loading state.
 * A positive integer `refreshIntervalMs` reloads the overview quietly at that interval.
 */
export function usePageOverview(
	projectId: MaybeRefOrGetter<string | undefined>,
	refreshIntervalMs: MaybeRefOrGetter<number | undefined>,
) {
	const i18n = useI18n();
	const toast = useToast();
	const pageStore = usePageStore();

	const isLoading = ref(false);
	const overview = computed(() => pageStore.overviewOf(toValue(projectId)));

	/** Rejects when the server gives no overview. The overview that was loaded before stays. */
	async function refresh(): Promise<void> {
		await pageStore.fetchOverview(toValue(projectId));
	}

	/** A failed quiet reload keeps the overview that was loaded before and tells nothing. */
	async function refreshQuietly(): Promise<void> {
		await refresh().catch(() => undefined);
	}

	async function load(): Promise<void> {
		isLoading.value = overview.value === undefined;
		try {
			await refresh();
		} catch (error) {
			toast.showError(error, i18n.baseText('page.overview.loadError'));
		} finally {
			isLoading.value = false;
		}
	}

	watch(() => toValue(projectId), load, { immediate: true });

	watch(
		() => toValue(refreshIntervalMs),
		(intervalMs, _previous, onCleanup) => {
			if (intervalMs !== undefined) {
				const timer = setInterval(() => {
					void refreshQuietly();
				}, toRefreshIntervalMs(intervalMs));
				onCleanup(() => clearInterval(timer));
			}
		},
		{ immediate: true },
	);

	return { overview, isLoading, refresh, refreshQuietly };
}
