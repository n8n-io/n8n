<script setup lang="ts">
import { VisuallyHidden } from 'reka-ui';

defineProps<{
	asChild?: boolean;
}>();
</script>

<template>
	<VisuallyHidden :as-child="asChild">
		<slot />
	</VisuallyHidden>
</template>
