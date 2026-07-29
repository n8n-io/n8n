<script lang="ts" setup>
import type { IconButtonProps } from '../../types/button';
import N8nButton from '../N8nButton';

defineOptions({ name: 'N8nIconButton' });
const props = withDefaults(defineProps<IconButtonProps>(), {
	size: 'medium',
	loading: false,
	disabled: false,
	iconOnly: true,
});
</script>

<template>
	<N8nButton v-bind="{ ...$attrs, ...props }" />
</template>
