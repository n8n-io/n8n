<template>
	<N8nButton square v-bind="{ ...$attrs, ...$props }" />
</template>

<script lang="ts" setup>
import type { IconButtonProps } from 'n8n-design-system/types/button';
import N8nButton from '../N8nButton';

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
