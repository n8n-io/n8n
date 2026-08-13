<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ summary: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="Wait" :title="summary" @press="$emit('press')"
		><p :class="$style.summary">{{ summary }}</p></ActionCard
	>
</template>
<style lang="scss" module>
.summary {
	margin: 0;
	color: var(--text-color--subtle);
}
</style>
