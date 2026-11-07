<script setup lang="ts">
import AiGatewayBalancePill, { type AiGatewayBalancePillValue } from './AiGatewayBalancePill.vue';

/**
 * Non-interactive balance pill drawn over a collapsed credential select while
 * Gateway credits are selected. The host stacks it in the select's grid area
 * `control` and sets these variables:
 * - `--credential-select-label-padding`: left offset of the selected label
 * - `--credential-select-balance-gap`: space between the label and the pill
 * - `--credential-select-balance-space`: room kept free for the select caret
 */
defineProps<{
	label: string;
	pill: AiGatewayBalancePillValue;
	muted?: boolean;
}>();
</script>

<template>
	<div
		data-test-id="credential-balance-indicator"
		:class="[$style.indicator, { [$style.muted]: muted }]"
	>
		<!-- Invisible copy of the selected label reserves its exact rendered width
		     so the pill sits the same gap after it as in the dropdown row. -->
		<span :class="$style.labelSizer" aria-hidden="true">{{ label }}</span>
		<AiGatewayBalancePill :pill="pill" />
	</div>
</template>

<style lang="scss" module>
.indicator {
	grid-area: control;
	display: flex;
	align-items: center;
	align-self: center;
	justify-self: start;
	gap: var(--credential-select-balance-gap);
	padding-left: var(--credential-select-label-padding);
	max-width: calc(100% - var(--credential-select-balance-space));
	z-index: 1;
	pointer-events: none;
}

// Mirrors the el-select trigger label (size small = 12px); hidden but still
// occupies layout space.
.labelSizer {
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	visibility: hidden;
}

.muted {
	opacity: 0.6;
}
</style>
