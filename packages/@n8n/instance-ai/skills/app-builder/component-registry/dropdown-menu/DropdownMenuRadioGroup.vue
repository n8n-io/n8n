<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';

const model = defineModel<string>();
</script>

<template>
	<ArkMenu.RadioItemGroup v-model="model">
		<slot />
	</ArkMenu.RadioItemGroup>
</template>
