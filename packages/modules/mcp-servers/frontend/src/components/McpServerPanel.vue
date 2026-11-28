<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useId } from 'vue';

// A surface panel of the server Build tab, matching AgentPanel in the agent builder.
defineProps<{
	header: string;
	description?: string;
}>();

defineSlots<{
	default?: () => unknown;
	'header-actions'?: () => unknown;
}>();

const headerId = useId();
</script>

<template>
	<section :class="$style.panel" :aria-labelledby="headerId">
		<div :class="$style.headerRow">
			<div :class="$style.copy">
				<N8nText :id="headerId" tag="h3" step="sm" bold>{{ header }}</N8nText>
				<N8nText v-if="description" color="text-light">{{ description }}</N8nText>
			</div>
			<div v-if="$slots['header-actions']" :class="$style.actions">
				<slot name="header-actions" />
			</div>
		</div>
		<slot />
	</section>
</template>

<style lang="scss" module>
.panel {
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md) var(--spacing--sm);
	background-color: var(--background--surface);
	border-radius: var(--radius);
	border: var(--border);
	box-shadow: var(--shadow--xs);
}

.headerRow {
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
