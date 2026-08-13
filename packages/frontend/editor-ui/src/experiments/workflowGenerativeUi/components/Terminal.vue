<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ command: string; cwd: string | null; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="Terminal" :title="cwd ?? 'Shell'" @press="$emit('press')">
		<pre :class="$style.command"><span>$</span> {{ command }}</pre>
	</ActionCard>
</template>
<style lang="scss" module>
.command {
	margin: calc(var(--spacing--xs) * -1);
	padding: var(--spacing--sm);
	overflow-x: auto;
	color: var(--text-color--inverse);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	background: var(--background--inverse);
}
.command span {
	color: var(--color--green-400);
}
</style>
