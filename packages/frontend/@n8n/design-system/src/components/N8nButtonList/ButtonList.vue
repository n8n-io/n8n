<script lang="ts" setup>
import type { ButtonListProps } from './ButtonList.types';

withDefaults(defineProps<ButtonListProps>(), {
	orientation: 'horizontal',
});
</script>

<template>
	<div
		:class="[$style.root, orientation === 'vertical' ? $style.vertical : $style.horizontal]"
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
</style>
