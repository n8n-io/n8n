<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ app: string; to: string; bodyPreview: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" :label="app" :title="to" @press="$emit('press')"
		><p :class="$style.message">{{ bodyPreview }}</p></ActionCard
	>
</template>
<style lang="scss" module>
.message {
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color);
	background: var(--background--subtle);
	border-radius: var(--radius--sm) var(--radius--sm) var(--radius--sm) var(--radius--3xs);
}
</style>
