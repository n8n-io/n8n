<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{
	kind: 'schedule' | 'form' | 'webhook' | 'chat' | 'email' | 'file' | 'appEvent' | 'manual';
	summary: string;
	app: string | null;
	nodeId?: string | null;
}>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard
		:node-id="nodeId"
		label="When"
		:title="app ?? kind"
		:badge="kind"
		@press="$emit('press')"
		><p :class="$style.summary">{{ summary }}</p></ActionCard
	>
</template>
<style lang="scss" module>
.summary {
	margin: 0;
	color: var(--text-color--subtle);
}
</style>
