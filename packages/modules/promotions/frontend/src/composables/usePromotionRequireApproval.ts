import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, ref } from 'vue';

import { getPromotionSettings } from '../promotions.api';

/**
 * Whether the "Require approval" instance setting sends every promote to a new branch.
 * Undefined until the setting loads, and after a failed load, so the page never guesses.
 */
export function usePromotionRequireApproval() {
	const rootStore = useRootStore();
	const isAlwaysRequired = ref<boolean>();

	onMounted(async () => {
		try {
			const settings = await getPromotionSettings(rootStore.publicApiContext);
			isAlwaysRequired.value = settings.requireApproval === 'alwaysRequired';
		} catch {
			// The server applies the setting on every promote, so the page works without it.
		}
	});

	return { isAlwaysRequired };
}
