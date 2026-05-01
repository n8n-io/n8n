<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { ToolCall } from '../composables/agentChatMessages';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';

defineProps<{
	toolCalls: ToolCall[];
}>();
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
				{{ formatToolNameForDisplay(tc.tool) }}
			</span>
			<span
				v-if="tc.displaySummary"
				:class="$style.toolStepSummary"
				data-testid="tool-step-summary"
			>
				· {{ tc.displaySummary }}
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

.toolStepSummary {
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
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
