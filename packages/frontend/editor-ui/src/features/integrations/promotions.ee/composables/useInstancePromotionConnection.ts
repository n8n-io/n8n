import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchPromotionConnections,
	type PromotionConnectionSummary,
} from '../promotionsSettings.api';

type ConnectionLookup = { connection: PromotionConnectionSummary | null; failed: boolean };

let instanceConnection: Promise<ConnectionLookup> | undefined;

export function invalidateInstancePromotionConnection() {
	instanceConnection = undefined;
}

/** The instance connection and which directions it has, so callers only ask for those. */
export function useInstancePromotionConnection() {
	const rootStore = useRootStore();
	const connection = ref<PromotionConnectionSummary | null>(null);
	/** True when the last lookup failed, so a caller can tell it apart from "no connection". */
	const failed = ref(false);

	async function load() {
		instanceConnection ??= fetchPromotionConnections(rootStore.publicApiContext, {
			scope: 'instance',
		})
			.then((connections) => ({ connection: connections[0] ?? null, failed: false }))
			.catch(() => {
				invalidateInstancePromotionConnection();
				return { connection: null, failed: true };
			});
		const lookup = await instanceConnection;
		connection.value = lookup.connection;
		failed.value = lookup.failed;
	}

	const hasPromoteConfig = computed(() => connection.value?.configs.promote !== undefined);
	const hasApplyConfig = computed(() => connection.value?.configs.apply !== undefined);

	return { connection, failed, hasPromoteConfig, hasApplyConfig, load };
}
