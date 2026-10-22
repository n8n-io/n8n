<script setup lang="ts">
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { computed } from 'vue';

import type { KeyboardShortcut } from '../../types/keyboardshortcut';

const props = defineProps<KeyboardShortcut>();
const { isMacOs, controlKeyText } = useDeviceSupport();

const keys = computed(() => {
	const allKeys: string[] = [];

	if (props.metaKey) {
		allKeys.push(controlKeyText.value);
	}

	if (props.shiftKey) {
		allKeys.push('⇧');
	}

	if (props.altKey) {
		allKeys.push(isMacOs ? '⌥' : 'Alt');
	}

	allKeys.push(...props.keys.map((key) => key.charAt(0).toUpperCase() + key.slice(1)));

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
	gap: var(--spacing--4xs);
}
.keyWrapper {
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: var(--radius--2xs);
	height: 18px;
	min-width: 18px;
	padding: 0 var(--spacing--4xs);
	border: 0.5px solid var(--border-color--subtle);
	background-clip: padding-box;
	box-shadow: var(--shadow--xs);
	background: var(--n8n--kbd-bg, var(--color--background));
}

.key {
	color: var(--n8n--kbd-text, var(--color--text));
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family--monospace);
	font-variant-numeric: tabular-nums;
}
</style>
