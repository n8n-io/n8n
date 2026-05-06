<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{
	title: string;
	description?: string;
}>();
</script>

<template>
	<div :class="$style.text">
		<N8nText tag="h3" size="xlarge" :bold="true">{{ title }}</N8nText>
		<N8nText v-if="description" color="text-light">{{ description }}</N8nText>
	</div>
</template>

<style module lang="scss">
.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}
</style>
