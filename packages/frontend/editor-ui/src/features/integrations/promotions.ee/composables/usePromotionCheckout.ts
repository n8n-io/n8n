import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { computed, reactive } from 'vue';

import { connectPromotionCheckout } from '../promotionsSettings.api';

/** The API does not store connect errors, so they live until the page reloads. */
const connectErrors = reactive(new Map<string, string>());

export function usePromotionCheckout() {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();

	const permissions = computed(
		() => getResourcePermissions(usersStore.currentUser?.globalScopes).promotions,
	);
	const canConnect = computed(() => !!permissions.value.connect);

	async function connect(environmentId: string): Promise<boolean> {
		try {
			await connectPromotionCheckout(rootStore.publicApiContext, environmentId);
			connectErrors.delete(environmentId);
			return true;
		} catch (error) {
			connectErrors.set(environmentId, getErrorMessage(error));
			return false;
		}
	}

	return { connectErrors, permissions, canConnect, connect };
}
