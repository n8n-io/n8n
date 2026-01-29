<script lang="ts" setup>
import type { IconButtonProps } from '../../types/button';
import N8nButton from '../N8nButton';

defineOptions({ name: 'N8nIconButton' });
withDefaults(defineProps<IconButtonProps>(), {
	size: 'medium',
	loading: false,
	disabled: false,
});
</script>

<template>
	<N8nButton iconOnly v-bind="{ ...$attrs, ...$props }" />
</template>
