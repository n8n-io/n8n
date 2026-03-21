<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{
	text: string;
}>();
</script>

<template>
	<li :class="$style.emptyState">
		<N8nText color="text-base" size="small">{{ text }}</N8nText>
	</li>
</template>

<style module lang="scss">
.emptyState {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--md) var(--spacing--xs);
}
</style>
