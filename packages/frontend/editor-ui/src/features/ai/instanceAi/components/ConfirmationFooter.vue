<script lang="ts" setup>
withDefaults(
	defineProps<{
		layout?: 'row-end' | 'row-between' | 'column';
		bordered?: boolean;
	}>(),
	{
		layout: 'row-end',
		bordered: false,
	},
);
</script>

<template>
	<div :class="[$style.footer, $style[layout], bordered && $style.bordered]">
		<slot />
	</div>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	padding: var(--spacing--xs) var(--spacing--sm);
}

.row-end {
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}

.row-between {
	justify-content: space-between;
	align-items: center;
}

.column {
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.bordered {
	border-top: var(--border);
}
</style>
