<template>
	<N8nButton square v-bind="{ ...$attrs, ...$props }" />
</template>

<script lang="ts" setup>
import N8nButton from '../N8nButton/Button.vue';
import type { IconButtonProps } from '../../types/button';

defineOptions({ name: 'N8nIconButton' });
withDefaults(defineProps<IconButtonProps>(), {
	type: 'primary',
	size: 'medium',
	loading: false,
	outline: false,
	text: false,
	disabled: false,
	active: false,
});
</script>
