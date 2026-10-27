<script setup lang="ts">
import { TooltipProvider } from 'reka-ui';

interface Props {
	/** Time in milliseconds after a tooltip closes when other tooltips open immediately. */
	skipDelayDuration?: number;
}

withDefaults(defineProps<Props>(), {
	skipDelayDuration: 2_000,
});
</script>

<template>
	<TooltipProvider :skip-delay-duration="skipDelayDuration">
		<slot />
	</TooltipProvider>
</template>
