<script lang="ts" setup>
// `tool` renders as a monospace (non-bold) prefix at the start of the
// preview box (e.g. "workflows.delete"); the slot content that follows
// uses the default body font so the technical identifier stands out
// against the human-readable description.
defineProps<{ tool?: string }>();
</script>

<template>
	<div :class="$style.preview">
		<span v-if="tool" :class="$style.tool">{{ tool }}</span>
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
