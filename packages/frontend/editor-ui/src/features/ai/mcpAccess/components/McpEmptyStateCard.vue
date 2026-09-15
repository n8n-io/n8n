<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import McpClientLogoCards from '@/features/ai/mcpAccess/components/McpClientLogoCards.vue';

withDefaults(
	defineProps<{
		title: string;
		description: string;
		/** White surface instead of the page background (for the standalone disabled state). */
		surface?: boolean;
		dataTestId?: string;
	}>(),
	{ surface: false, dataTestId: undefined },
);
</script>

<template>
	<div :class="[$style.card, surface && $style.surface]" :data-test-id="dataTestId">
		<McpClientLogoCards :class="$style.cards" />
		<div :class="$style.copy">
			<N8nText bold size="large" color="text-dark">{{ title }}</N8nText>
			<N8nText size="small" color="text-light">{{ description }}</N8nText>
		</div>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xl) var(--spacing--xl);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
	/* Gentle entrance, matching the prototype's empty states. */
	animation: mcp-reveal-in var(--duration--snappy) var(--easing--ease-out);
}

.surface {
	background: var(--background--surface);
}

@keyframes mcp-reveal-in {
	from {
		opacity: 0;
		transform: translateY(var(--spacing--2xs));
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.card {
		animation: none;
	}
}

.cards {
	margin-bottom: var(--spacing--sm);
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-width: 32rem;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}
</style>
