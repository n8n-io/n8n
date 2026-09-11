<script setup lang="ts">
import { Dialog as ArkDialog } from '@ark-ui/vue/dialog';
</script>

<template>
	<ArkDialog.Trigger as-child>
		<slot />
	</ArkDialog.Trigger>
</template>
