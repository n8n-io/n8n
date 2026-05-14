<script setup lang="ts">
import { TooltipProvider } from 'reka-ui';
import { provide } from 'vue';

import { TOOLTIP_GROUP_INJECTION_KEY } from './constants';

defineOptions({
	name: 'N8nTooltipGroup',
});

withDefaults(
	defineProps<{
		/** Delay in milliseconds before the first tooltip in the group opens */
		delayDuration?: number;
		/** Grace period in milliseconds for instant switching between tooltips. 0 = instant */
		skipDelayDuration?: number;
	}>(),
	{
		delayDuration: 500,
		skipDelayDuration: 0,
	},
);

provide(TOOLTIP_GROUP_INJECTION_KEY, true);
</script>

<template>
	<TooltipProvider :delay-duration="delayDuration" :skip-delay-duration="skipDelayDuration">
		<slot />
	</TooltipProvider>
</template>
