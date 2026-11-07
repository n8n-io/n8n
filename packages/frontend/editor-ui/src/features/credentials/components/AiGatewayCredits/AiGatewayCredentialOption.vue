<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';

import AiGatewayBalancePill, { type AiGatewayBalancePillValue } from './AiGatewayBalancePill.vue';

/**
 * Content of the managed "Gateway credits" row in a credential select: wallet
 * icon, label, balance pill, and a checkmark when selected. With a subtitle,
 * the label stacks over it and the pill moves to the end of the row.
 */
defineProps<{
	label: string;
	subtitle?: string;
	pill?: AiGatewayBalancePillValue;
	selected?: boolean;
}>();
</script>

<template>
	<div :class="$style.option">
		<N8nIcon icon="wallet" size="large" :class="$style.icon" />
		<span v-if="subtitle" :class="$style.text">
			<N8nText :class="$style.label">{{ label }}</N8nText>
			<N8nText :class="$style.subtitle">{{ subtitle }}</N8nText>
		</span>
		<N8nText v-else :class="$style.label">{{ label }}</N8nText>
		<AiGatewayBalancePill v-if="pill" :pill="pill" :class="{ [$style.trailingPill]: !!subtitle }" />
		<N8nIcon v-if="selected" icon="check" size="large" :class="$style.check" />
	</div>
</template>

<style lang="scss" module>
.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}

.icon {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.text {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	min-width: 0;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.subtitle {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

.trailingPill {
	margin-left: auto;
}

.check {
	flex-shrink: 0;
	margin-left: auto;
	color: var(--color--text--shade-1);
}
</style>
