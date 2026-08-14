import type { Ref } from 'vue';
import { nextTick, ref } from 'vue';

/**
 * Open/close state for a resource-locator–style list dropdown. Shared by the
 * workflow and agent selector inputs (the logic is not specific to either).
 */
export function useResourceLocatorDropdown(
	isListMode: Ref<boolean>,
	inputRef: Ref<HTMLInputElement | undefined>,
) {
	const isDropdownVisible = ref(false);
	const resourceDropdownHiding = ref(false);

	function showDropdown() {
		if (!isListMode.value || resourceDropdownHiding.value) {
			return;
		}

		isDropdownVisible.value = true;
	}

	function hideDropdown() {
		isDropdownVisible.value = false;

		resourceDropdownHiding.value = true;
		void nextTick(() => {
			inputRef.value?.blur?.();
			resourceDropdownHiding.value = false;
		});
	}

	return {
		isDropdownVisible,
		showDropdown,
		hideDropdown,
	};
}
