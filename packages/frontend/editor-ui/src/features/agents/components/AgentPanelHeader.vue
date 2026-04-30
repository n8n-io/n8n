<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{
	title: string;
	description?: string;
}>();
</script>

<template>
	<div :class="$style.header">
		<div :class="$style.text">
			<N8nText tag="h3" size="xlarge" :bold="true">{{ title }}</N8nText>
			<N8nText v-if="description" color="text-light">{{ description }}</N8nText>
		</div>
		<slot name="actions" />
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--2xs);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}
</style>
