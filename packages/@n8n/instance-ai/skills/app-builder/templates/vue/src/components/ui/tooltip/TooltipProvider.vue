<script setup lang="ts">
import type { TooltipProviderProps } from 'reka-ui';
import { TooltipProvider } from 'reka-ui';

const props = withDefaults(defineProps<TooltipProviderProps>(), {
	delayDuration: 0,
});
</script>

<template>
	<TooltipProvider v-bind="props">
		<slot />
	</TooltipProvider>
</template>
