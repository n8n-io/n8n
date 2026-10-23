<script lang="ts" setup>
import type { ButtonListProps } from './ButtonList.types';

withDefaults(defineProps<ButtonListProps>(), {
	orientation: 'horizontal',
	variant: 'default',
});
</script>

<template>
	<div
		:class="[
			$style.root,
			orientation === 'vertical' ? $style.vertical : $style.horizontal,
			{ [$style.toolbar]: variant === 'toolbar' },
		]"
		role="group"
	>
		<slot />
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.horizontal {
	flex-direction: row;
	flex-wrap: nowrap;
}

.vertical {
	flex-direction: column;
	align-items: stretch;
}

.toolbar {
	gap: 0;
	padding: var(--spacing--5xs);
	border-radius: var(--radius--2xs);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--xs);
}
</style>
