<script setup lang="ts">
import ActionCard from './ActionCard.vue';

defineProps<{
	title: string;
	summary: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<ActionCard
		:node-id="nodeId"
		label="Step"
		:title="title"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<p :class="$style.summary">{{ summary }}</p>
	</ActionCard>
</template>

<style lang="scss" module>
.summary {
	margin: 0;
	color: var(--text-color--subtle);
}
</style>
