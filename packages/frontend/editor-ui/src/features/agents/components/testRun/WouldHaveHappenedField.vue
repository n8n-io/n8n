<script setup lang="ts">
/** One label and value row. Use it inside the card's description list. */
defineProps<{
	label: string;
}>();
</script>

<template>
	<div :class="$style.field">
		<dt :class="$style.label">{{ label }}</dt>
		<dd :class="$style.value"><slot /></dd>
	</div>
</template>

<style module lang="scss">
.field {
	display: grid;
	grid-template-columns: fit-content(40%) minmax(0, 1fr);
	column-gap: var(--spacing--xs);
	align-items: baseline;
	min-width: 0;
}

.label {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	overflow-wrap: anywhere;
}

.value {
	margin: 0;
	min-width: 0;
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	overflow-wrap: anywhere;
	user-select: text;
}
</style>
