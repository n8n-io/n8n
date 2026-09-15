<script setup lang="ts">
import { Dialog as ArkDialog } from '@ark-ui/vue/dialog';

const open = defineModel<boolean>('open', { default: false });
</script>

<template>
	<ArkDialog.Root v-model:open="open">
		<slot />
	</ArkDialog.Root>
</template>
