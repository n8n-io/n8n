import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchPromotionConnections,
	type PromotionConnectionSummary,
} from '../promotionsSettings.api';

let instanceConnection: Promise<PromotionConnectionSummary | null> | undefined;

export function invalidatePromotionConnection() {
	instanceConnection = undefined;
}

/** The instance connection and which directions it has, so callers only ask for those. */
export function usePromotionConnection() {
	const rootStore = useRootStore();
	const connection = ref<PromotionConnectionSummary | null>(null);

	async function load() {
		instanceConnection ??= fetchPromotionConnections(rootStore.publicApiContext, {
			scope: 'instance',
		})
			.then((connections) => connections[0] ?? null)
			.catch(() => {
				invalidatePromotionConnection();
				return null;
			});
		connection.value = await instanceConnection;
	}

	const hasPromoteConfig = computed(() => connection.value?.configs.promote !== undefined);
	const hasApplyConfig = computed(() => connection.value?.configs.apply !== undefined);

	return { connection, hasPromoteConfig, hasApplyConfig, load };
}
