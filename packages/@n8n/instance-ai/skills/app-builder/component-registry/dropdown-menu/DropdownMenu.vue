<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';

const open = defineModel<boolean>('open', { default: false });
</script>

<template>
	<ArkMenu.Root v-model:open="open">
		<slot />
	</ArkMenu.Root>
</template>
