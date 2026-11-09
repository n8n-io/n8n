import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchPromotionEnvironments,
	type PromotionEnvironmentSummary,
} from '../promotionsSettings.api';

type EnvironmentLookup = { environments: PromotionEnvironmentSummary[]; failed: boolean };

let instanceEnvironments: Promise<EnvironmentLookup> | undefined;

export function invalidateInstancePromotionConnection() {
	instanceEnvironments = undefined;
}

/** The instance environments and their directions, so callers only ask for those. */
export function useInstancePromotionConnection() {
	const rootStore = useRootStore();
	const environments = ref<PromotionEnvironmentSummary[]>([]);
	/** True when the last lookup failed, so a caller can tell it apart from "no environment". */
	const failed = ref(false);

	async function load() {
		instanceEnvironments ??= fetchPromotionEnvironments(rootStore.publicApiContext, {
			scope: 'instance',
		})
			.then((found) => ({ environments: found, failed: false }))
			.catch(() => {
				invalidateInstancePromotionConnection();
				return { environments: [], failed: true };
			});
		const lookup = await instanceEnvironments;
		environments.value = lookup.environments;
		failed.value = lookup.failed;
	}

	const hasPromoteConfig = computed(() =>
		environments.value.some(({ direction }) => direction === 'promote'),
	);
	const hasApplyConfig = computed(() =>
		environments.value.some(({ direction }) => direction === 'apply'),
	);

	return { environments, failed, hasPromoteConfig, hasApplyConfig, load };
}
