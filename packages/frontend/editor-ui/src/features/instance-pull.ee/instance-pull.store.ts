import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getMyReviews, getRequests } from './instance-pull.api';
import type { InstancePullRole, ReviewSummary } from './types';

export const INSTANCE_PULL_STORE = 'instancePull';

export const useInstancePullStore = defineStore(INSTANCE_PULL_STORE, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const reviews = ref<ReviewSummary[]>([]);
	const loading = ref(false);

	const enabled = computed(() => settingsStore.instancePull?.enabled ?? false);
	const role = computed<InstancePullRole | undefined>(() => settingsStore.instancePull?.role);
	const isDev = computed(() => role.value === 'dev');
	const isPrd = computed(() => role.value === 'prd');

	/** Open PRs the prd operator still needs to act on (missing credentials). */
	const blockedReviews = computed(() =>
		reviews.value.filter((review) => review.status === 'blocked'),
	);

	const blockedCount = computed(() => blockedReviews.value.length);

	async function fetchReviews(): Promise<void> {
		if (!enabled.value || !role.value) return;

		loading.value = true;
		try {
			reviews.value = isPrd.value
				? await getRequests(rootStore.restApiContext)
				: await getMyReviews(rootStore.restApiContext);
		} finally {
			loading.value = false;
		}
	}

	return {
		reviews,
		loading,
		enabled,
		role,
		isDev,
		isPrd,
		blockedReviews,
		blockedCount,
		fetchReviews,
	};
});
