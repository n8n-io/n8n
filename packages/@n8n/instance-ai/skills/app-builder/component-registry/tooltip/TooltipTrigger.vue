<script setup lang="ts">
import { Tooltip as ArkTooltip } from '@ark-ui/vue/tooltip';
</script>

<template>
	<ArkTooltip.Trigger as-child>
		<slot />
	</ArkTooltip.Trigger>
</template>
