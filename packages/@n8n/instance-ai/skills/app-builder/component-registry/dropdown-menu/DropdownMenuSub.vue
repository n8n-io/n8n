<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';

// A nested Menu.Root: place a DropdownMenuSubTrigger and a DropdownMenuContent
// inside it, the same shape as a top-level DropdownMenu.
</script>

<template>
	<ArkMenu.Root>
		<slot />
	</ArkMenu.Root>
</template>
