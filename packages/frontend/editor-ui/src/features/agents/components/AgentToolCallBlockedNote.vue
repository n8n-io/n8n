<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ToolCallSimulation } from '../toolCallSimulation.types';
import {
	getToolCallBlockedNextStepKey,
	getToolCallReasonKey,
	isSimulatorSideReason,
} from '../utils/toolCallSimulation';

/**
 * Explains a blocked tool call in a test run: why it did not run and what to do next.
 * Renders nothing for calls that ran.
 */
const props = defineProps<{
	simulation: ToolCallSimulation;
}>();

const i18n = useI18n();

const isBlocked = computed(() => props.simulation.route === 'blocked');

/** A simulator gap is not the agent's fault, so it is not shown as a warning. */
const simulatorSide = computed(() => isSimulatorSideReason(props.simulation.reason));

const reasonText = computed(() => {
	const key = getToolCallReasonKey(props.simulation.reason);
	return key ? i18n.baseText(key) : '';
});

const detail = computed(() => props.simulation.detail?.trim() ?? '');

const nextStep = computed(() =>
	i18n.baseText(getToolCallBlockedNextStepKey(props.simulation.reason)),
);
</script>

<template>
	<div
		v-if="isBlocked"
		role="note"
		:class="[$style.note, simulatorSide ? $style.simulatorSide : $style.agentSide]"
		:data-reason="simulation.reason"
		data-test-id="agent-tool-call-blocked-note"
	>
		<N8nIcon :icon="simulatorSide ? 'info' : 'ban'" size="small" :class="$style.icon" />
		<div :class="$style.body">
			<N8nText v-if="reasonText" size="small" data-test-id="agent-tool-call-blocked-reason">
				{{ reasonText }}
			</N8nText>
			<N8nText
				v-if="detail"
				size="small"
				color="text-light"
				:class="$style.detail"
				data-test-id="agent-tool-call-blocked-detail"
			>
				{{ detail }}
			</N8nText>
			<N8nText size="small" bold data-test-id="agent-tool-call-blocked-next-step">
				{{ nextStep }}
			</N8nText>
		</div>
	</div>
</template>

<style module>
.note {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
	min-width: 0;
	max-width: 100%;
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}

.simulatorSide .icon {
	color: var(--callout--icon-color--info);
}

.agentSide .icon {
	color: var(--callout--icon-color--warning);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.detail {
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	overflow: hidden;
}
</style>
