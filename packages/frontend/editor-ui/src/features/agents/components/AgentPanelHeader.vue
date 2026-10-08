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
	flex-wrap: wrap;
	align-items: flex-start;
	gap: var(--spacing--xs);
	container: agent-panel-header / inline-size;
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
	max-width: 80%;

	> span {
		text-wrap: balance;
	}
}

// A container query does not resolve a custom property.
// 34.5rem matches the narrow setting row. The 80% cap squeezes the description there.
@container agent-panel-header (max-width: 34.5rem) {
	.copy {
		flex-basis: 100%;
		max-width: 100%;
	}

	.actions {
		margin-inline-start: 0;
	}
}

.actions {
	margin-inline-start: auto;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
