<script setup lang="ts">
import 'ninja-keys';
import type { INinjaAction } from 'ninja-keys/dist/interfaces/ininja-action';

interface Props {
	hotkeys: INinjaAction[];
}

const props = defineProps<Props>();
</script>

<template>
	<ninja-keys :data="props.hotkeys" :no-auto-load-md-icons="true"></ninja-keys>
</template>

<style scoped>
ninja-keys {
	--ninja-z-index: 1000;
	--ninja-accent-color: var(--color-primary);
	--ninja-actions-height: 400px;
	--ninja-modal-background: var(--color-node-background);
	--ninja-secondary-background-color: var(--color-background-base);
	--ninja-secondary-text-color: var(--color-text);
	--ninja-text-color: var(--color-text);
	--ninja-accent-color: var(--color-primary);
	--ninja-selected-background: var(--color-node-executing-background);
	--ninja-separate-border: 1px solid var(--color-foreground-base);
	--ninja-footer-background: var(--color-background-light);
	--ninja-overflow-background: rgba(0, 0, 0, 0.5);
	--ninja-font-size: var(--font-size-s);
}

ninja-keys::part(ninja-action) {
	line-height: var(--font-line-height-loose);
	gap: 16px;
}
</style>
