import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';

import { GROUP_CARD_VARIANTS } from './registry';

const STORAGE_KEY = 'n8n.prototype.groupCardVariant';

// Module-level singleton ref: a per-instance `useLocalStorage` would not sync
// within the same tab (the storage event doesn't fire for the writing
// document), so the switcher and every collapsed card share this one ref.
const activeVariantId = useLocalStorage<string>(STORAGE_KEY, GROUP_CARD_VARIANTS[0].id);

export function useGroupCardVariant() {
	const activeVariant = computed(
		() =>
			GROUP_CARD_VARIANTS.find((variant) => variant.id === activeVariantId.value) ??
			GROUP_CARD_VARIANTS[0],
	);

	function setVariant(id: string) {
		activeVariantId.value = id;
	}

	return {
		variants: GROUP_CARD_VARIANTS,
		activeVariantId,
		activeVariant,
		setVariant,
	};
}
