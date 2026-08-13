<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{
	direction: 'upload' | 'download' | 'copy';
	app: string;
	path: string;
	nodeId?: string | null;
}>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard
		:node-id="nodeId"
		label="File transfer"
		:title="app"
		:badge="direction"
		@press="$emit('press')"
		><code :class="$style.path">{{ path }}</code></ActionCard
	>
</template>
<style lang="scss" module>
.path {
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}
</style>
