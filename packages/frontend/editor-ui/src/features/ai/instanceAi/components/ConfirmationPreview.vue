<script lang="ts" setup>
// `tool` renders as a bold monospace prefix inside the preview box (e.g.
// "Fetch", "Tagging workflow") so every approval surface — generic or
// specialised (DomainAccessApproval, etc.) — leads with the tool name.
defineProps<{ tool?: string }>();
</script>

<template>
	<div :class="$style.preview">
		<strong v-if="tool" :class="$style.tool">{{ tool }}</strong>
		<slot />
	</div>
</template>

<style lang="scss" module>
.preview {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	word-break: break-all;
	padding: var(--spacing--2xs);
	background: light-dark(var(--color--background), var(--color--neutral-850));
	border-radius: var(--radius);
}

.tool {
	font-weight: var(--font-weight--bold);
	margin-right: var(--spacing--xs);
}
</style>
