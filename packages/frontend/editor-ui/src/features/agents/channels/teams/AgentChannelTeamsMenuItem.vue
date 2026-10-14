<script setup lang="ts">
/** A menu option with a line under it saying what it does. */
import { N8nText } from '@n8n/design-system';

defineProps<{ label: string; description?: string }>();
</script>

<template>
	<div :class="$style.item">
		<N8nText size="small" color="text-dark">{{ label }}</N8nText>
		<N8nText v-if="description" size="xsmall" color="text-light">{{ description }}</N8nText>
	</div>
</template>

<style module lang="scss">
.item {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs) 0;
	white-space: normal;
}
</style>
