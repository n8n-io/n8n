<script lang="ts" setup>
/**
 * One labelled part of a tool step, such as its input or its output. The
 * `actions` slot puts controls at the right end of the label row.
 */
defineProps<{
	label: string;
}>();
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.header">
			<span :class="$style.label">{{ label }}</span>
			<slot name="actions" />
		</div>
		<slot />
	</div>
</template>

<style module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	user-select: text;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.label {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtle);
}
</style>
