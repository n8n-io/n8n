import type { Ref } from 'vue';
import { nextTick, ref } from 'vue';

export function useWorkflowResourceLocatorDropdown(
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
