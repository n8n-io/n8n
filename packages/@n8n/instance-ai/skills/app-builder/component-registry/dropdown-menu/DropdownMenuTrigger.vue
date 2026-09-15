<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';
</script>

<template>
	<ArkMenu.Trigger as-child>
		<slot />
	</ArkMenu.Trigger>
</template>
