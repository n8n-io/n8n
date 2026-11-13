<script setup lang="ts">
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ToolCallSimulation } from '../toolCallSimulation.types';
import { getToolCallReasonKey, getToolCallRouteDisplay } from '../utils/toolCallSimulation';

/**
 * Shows how one tool call ran in a test run: real read, simulated,
 * simulated (made up) or blocked. The reason is in the tooltip.
 */
const props = defineProps<{
	simulation: ToolCallSimulation;
}>();

const i18n = useI18n();

const display = computed(() => getToolCallRouteDisplay(props.simulation.route));
const label = computed(() => (display.value ? i18n.baseText(display.value.labelKey) : ''));

const reasonText = computed(() => {
	const key = getToolCallReasonKey(props.simulation.reason);
	return key ? i18n.baseText(key) : '';
});

const detail = computed(() => props.simulation.detail?.trim() ?? '');

/** Read with the label, so screen readers get the reason without hovering. */
const srReason = computed(() => [reasonText.value, detail.value].filter(Boolean).join(' '));
</script>

<template>
	<N8nTooltip
		v-if="display"
		as-child
		placement="top"
		:disabled="!reasonText && !detail"
		:content-class="$style.tooltip"
	>
		<template #content>
			<div :class="$style.tooltipBody" data-test-id="agent-tool-call-route-reason">
				<span v-if="reasonText">{{ reasonText }}</span>
				<span v-if="detail" :class="$style.detail" data-test-id="agent-tool-call-route-detail">
					{{ detail }}
				</span>
			</div>
		</template>
		<span
			:class="$style.trigger"
			tabindex="0"
			:data-route="simulation.route"
			:data-reason="simulation.reason"
			data-test-id="agent-tool-call-route-label"
		>
			<N8nBadge
				:variant="display.variant"
				:leading-icon="display.icon"
				size="xsmall"
				:class="$style.badge"
			>
				{{ label }}
			</N8nBadge>
			<span v-if="srReason" :class="$style.visuallyHidden">{{ srReason }}</span>
		</span>
	</N8nTooltip>
</template>

<style module>
.trigger {
	position: relative;
	display: inline-flex;
	min-width: 0;
	max-width: 100%;
	border-radius: var(--radius--2xs);
	outline: none;
}

.trigger:focus-visible {
	box-shadow: 0 0 0 2px var(--color--secondary);
}

.badge {
	min-width: 0;
	max-width: 100%;
}

.visuallyHidden {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

.tooltip {
	max-width: calc(var(--spacing--5xl) + var(--spacing--lg));
	align-items: stretch;
	white-space: normal;
}

.tooltipBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	text-align: left;
}

.detail {
	opacity: 0.8;
	overflow-wrap: anywhere;
}
</style>
