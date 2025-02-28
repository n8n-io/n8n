<script setup lang="ts">
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { computed } from 'vue';

import type { KeyboardShortcut } from '../../types/keyboardshortcut';

const props = defineProps<KeyboardShortcut>();
const { isMacOs } = useDeviceSupport();

const keys = computed(() => {
	const allKeys = props.keys.map((key) => key.charAt(0).toUpperCase() + key.slice(1));

	if (props.metaKey && isMacOs) {
		allKeys.unshift('⌘');
	}

	if (props.metaKey && !isMacOs) {
		allKeys.unshift('Ctrl');
	}

	if (props.altKey) {
		allKeys.unshift(isMacOs ? '⌥' : 'Alt');
	}

	if (props.shiftKey) {
		allKeys.unshift('⇧');
	}

	return allKeys;
});
</script>

<template>
	<div :class="$style.shortcut">
		<div v-for="key of keys" :key="key" :class="$style.keyWrapper">
			<div :class="$style.key">{{ key }}</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.shortcut {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
}
.keyWrapper {
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: var(--border-radius-small);
	height: 18px;
	min-width: 18px;
	padding: 0 var(--spacing-4xs);
	border: solid 1px var(--color-foreground-base);
	background: var(--color-background-base);
}

.key {
	color: var(--color-text-base);
	font-size: var(--font-size-3xs);
}
</style>
