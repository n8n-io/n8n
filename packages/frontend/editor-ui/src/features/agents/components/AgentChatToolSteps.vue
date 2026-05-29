<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTimestamp } from '@vueuse/core';
import { computed, watch } from 'vue';
import type { ToolCall } from '../composables/agentChatMessages';
import { formatDuration } from '../session-timeline.utils';
import { formatToolNameForDisplay, getToolNameTranslationKey } from '../utils/toolDisplayName';

const props = defineProps<{
	toolCalls: ToolCall[];
}>();

const i18n = useI18n();

// Live clock for running tools. Ticks ~10x/s for a smooth stopwatch, and stays
// paused whenever nothing is running so finished/historical groups don't re-render.
const {
	timestamp: now,
	pause,
	resume,
} = useTimestamp({
	interval: 100,
	controls: true,
	immediate: false,
});

const hasRunningTool = computed(() =>
	props.toolCalls.some((tc) => tc.startTime !== undefined && tc.endTime === undefined),
);

watch(
	hasRunningTool,
	(running) => {
		if (running) resume();
		else pause();
	},
	{ immediate: true },
);

function getToolDisplayName(toolName: string): string {
	const translationKey = getToolNameTranslationKey(toolName);
	return translationKey ? i18n.baseText(translationKey) : formatToolNameForDisplay(toolName);
}

function toolDuration(tc: ToolCall): string {
	if (tc.startTime === undefined) return '';
	const end = tc.endTime ?? now.value;
	return formatDuration(end - tc.startTime);
}
</script>

<template>
	<ol :class="$style.toolSteps">
		<li v-for="(tc, i) in toolCalls" :key="i" :class="$style.toolStep">
			<div :class="$style.toolStepIndicator">
				<N8nIcon
					v-if="tc.state === 'done'"
					icon="circle-check"
					size="large"
					:class="$style.toolStepDone"
				/>
				<N8nIcon
					v-else-if="tc.state === 'error'"
					icon="circle-x"
					size="large"
					:class="$style.toolStepError"
				/>
				<N8nTooltip
					v-else-if="tc.state === 'suspended'"
					placement="top"
					content="Waiting for your input"
				>
					<N8nIcon icon="clock" size="large" :class="$style.toolStepSuspended" />
				</N8nTooltip>
				<N8nIcon v-else icon="spinner" size="large" :spin="true" :class="$style.toolStepLoading" />
			</div>
			<span :class="[$style.toolStepLabel, { [$style.shimmer]: tc.state === 'running' }]">
				{{ getToolDisplayName(tc.tool) }}
			</span>
			<span
				v-if="toolDuration(tc)"
				:class="$style.toolStepDuration"
				data-testid="tool-step-duration"
			>
				{{ toolDuration(tc) }}
			</span>
		</li>
	</ol>
</template>

<style module>
.toolSteps {
	list-style: none;
	margin: 0 0 var(--spacing--sm);
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.toolStep {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	position: relative;
	user-select: none;
}

.toolStepIndicator {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	height: 14px;
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.toolStep:not(:last-child) .toolStepIndicator::after {
	content: '';
	position: absolute;
	top: calc(100% + 1px);
	left: 50%;
	width: 1px;
	height: var(--spacing--2xs);
	transform: translateX(-50%);
	background-color: var(--border-color);
}

.toolStepDone {
	color: var(--text-color--success);
}

.toolStepError {
	color: var(--text-color--danger);
}

.toolStepLoading {
	color: var(--text-color);
}

.toolStepSuspended {
	color: var(--text-color--warning);
}

.toolStepLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtler);
	line-height: var(--line-height--sm);
}

.toolStepDuration {
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	font-variant-numeric: tabular-nums;
}

.shimmer {
	background: linear-gradient(
		90deg,
		var(--text-color--subtle) 25%,
		var(--text-color--subtler) 50%,
		var(--text-color--subtle) 75%
	);
	background-size: 200% 100%;
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}

	100% {
		background-position: -200% 0;
	}
}
</style>
