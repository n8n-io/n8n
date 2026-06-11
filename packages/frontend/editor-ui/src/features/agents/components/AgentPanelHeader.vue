<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{
	title: string;
	description?: string;
}>();
</script>

<template>
	<div :class="$style.text">
		<div :class="$style.row">
			<div :class="$style.copy">
				<N8nText tag="h3" size="xlarge" :bold="true">{{ title }}</N8nText>
				<N8nText v-if="description" color="text-light">{{ description }}</N8nText>
			</div>
			<div v-if="$slots.actions" :class="$style.actions">
				<slot name="actions" />
			</div>
		</div>
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

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
