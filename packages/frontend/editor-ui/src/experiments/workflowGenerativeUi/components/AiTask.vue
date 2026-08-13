<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ task: string; promptExcerpt: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="AI task" :title="task" @press="$emit('press')"
		><blockquote :class="$style.prompt">{{ promptExcerpt }}</blockquote></ActionCard
	>
</template>
<style lang="scss" module>
.prompt {
	margin: 0;
	padding-left: var(--spacing--xs);
	color: var(--text-color--subtle);
	font-style: italic;
	border-left: var(--focus--border-width) solid var(--border-color--strong);
}
</style>
