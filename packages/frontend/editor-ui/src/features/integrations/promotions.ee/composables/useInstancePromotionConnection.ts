import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchPromotionEnvironments,
	type PromotionEnvironmentSummary,
} from '../promotionsSettings.api';

let instanceEnvironments: Promise<PromotionEnvironmentSummary[]> | undefined;

export function invalidateInstancePromotionConnection() {
	instanceEnvironments = undefined;
}

/** The instance environments and their directions, so callers only ask for those. */
export function useInstancePromotionConnection() {
	const rootStore = useRootStore();
	const environments = ref<PromotionEnvironmentSummary[]>([]);

	async function load() {
		instanceEnvironments ??= fetchPromotionEnvironments(rootStore.publicApiContext, {
			scope: 'instance',
		}).catch(() => {
			invalidateInstancePromotionConnection();
			return [];
		});
		environments.value = await instanceEnvironments;
	}

	const hasPromoteConfig = computed(() =>
		environments.value.some(({ direction }) => direction === 'promote'),
	);
	const hasApplyConfig = computed(() =>
		environments.value.some(({ direction }) => direction === 'apply'),
	);

	return { environments, hasPromoteConfig, hasApplyConfig, load };
}
