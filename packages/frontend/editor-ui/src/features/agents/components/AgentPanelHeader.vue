<script setup lang="ts">
import { N8nText, N8nVisuallyHidden } from '@n8n/design-system';

withDefaults(
	defineProps<{
		title: string;
		description?: string;
		headerId: string;
		headerVisibility?: 'visible' | 'visually-hidden';
	}>(),
	{
		headerVisibility: 'visible',
	},
);
</script>

<template>
	<div
		:class="
			headerVisibility === 'visually-hidden' && !$slots.actions ? $style.headingOnly : $style.row
		"
	>
		<N8nVisuallyHidden v-if="headerVisibility === 'visually-hidden'" as-child>
			<h3 :id="headerId">{{ title }}</h3>
		</N8nVisuallyHidden>
		<div v-else :class="$style.copy">
			<N8nText :id="headerId" tag="h3" step="sm" :bold="true">{{ title }}</N8nText>
			<N8nText v-if="description" color="text-light">{{ description }}</N8nText>
		</div>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<style module lang="scss">
.headingOnly {
	display: contents;
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
	margin-inline-start: auto;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
