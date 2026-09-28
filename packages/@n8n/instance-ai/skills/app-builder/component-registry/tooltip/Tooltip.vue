<script setup lang="ts">
import { Tooltip as ArkTooltip } from '@ark-ui/vue/tooltip';

const open = defineModel<boolean>('open', { default: false });
</script>

<template>
	<ArkTooltip.Root v-model:open="open" :open-delay="300" :close-delay="0">
		<slot />
	</ArkTooltip.Root>
</template>
