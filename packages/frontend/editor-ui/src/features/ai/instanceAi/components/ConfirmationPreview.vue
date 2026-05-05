<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{ tool?: string }>();

const toolLabel = computed(() => {
	if (!props.tool) return '';
	const lastDot = props.tool.lastIndexOf('.');
	return lastDot === -1 ? props.tool : props.tool.slice(lastDot + 1);
});
</script>

<template>
	<div :class="$style.preview">
		<span v-if="toolLabel" :class="$style.tool">{{ toolLabel }}</span>
		<slot />
	</div>
</template>

<style lang="scss" module>
.preview {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	word-break: break-word;
	padding: var(--spacing--2xs);
	background: light-dark(var(--color--background), var(--color--neutral-850));
	border-radius: var(--radius);
}

.tool {
	font-family: var(--font-family--monospace);
	margin-right: var(--spacing--xs);
}
</style>
