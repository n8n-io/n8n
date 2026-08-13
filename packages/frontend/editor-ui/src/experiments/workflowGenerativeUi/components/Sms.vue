<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ to: string; bodyPreview: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="SMS" :title="to" @press="$emit('press')"
		><p :class="$style.message">{{ bodyPreview }}</p></ActionCard
	>
</template>
<style lang="scss" module>
.message {
	margin: 0;
	padding: var(--spacing--xs);
	color: var(--text-color);
	background: var(--background--info);
	border: var(--border);
	border-color: var(--border-color--info);
	border-radius: var(--radius--sm);
}
</style>
