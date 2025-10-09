<script setup lang="ts">
import { type KeyMap, useKeybindings } from '@/composables/useKeybindings';
import { PopOutWindowKey } from '@/constants';
import { useActiveElement } from '@vueuse/core';
import { ref, computed, toRef, inject } from 'vue';

const { container, keyMap } = defineProps<{ keyMap: KeyMap; container: HTMLElement | null }>();
const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());

const activeElement = useActiveElement({ window: popOutWindow?.value });
const isBlurred = computed(() => {
	if (popOutWindow?.value) {
		return popOutWindow.value.document.activeElement === null;
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

<template>
	<div />
</template>
