<script setup lang="ts">
import { type KeyMap, useKeybindings } from '@/composables/useKeybindings';
import { PiPWindowSymbol } from '@/constants';
import { useActiveElement } from '@vueuse/core';
import { computed, toRef, inject } from 'vue';

const { container, keyMap } = defineProps<{ keyMap: KeyMap; container: HTMLElement | null }>();
const pipWindow = inject(PiPWindowSymbol);

const activeElement = useActiveElement({ window: pipWindow?.value });
const isBlurred = computed(() => {
	if (pipWindow?.value) {
		return pipWindow.value.document.activeElement === null;
	}

	return (
		!activeElement.value ||
		!container ||
		(!container.contains(activeElement.value) && container !== activeElement.value)
	);
});

useKeybindings(
	toRef(() => keyMap),
	{ disabled: isBlurred },
);
</script>
