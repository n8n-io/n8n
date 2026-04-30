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
					:size="14"
					:class="$style.toolStepDone"
				/>
				<N8nIcon
					v-else-if="tc.state === 'error'"
					icon="circle-x"
					:size="14"
					:class="$style.toolStepError"
				/>
				<N8nTooltip
					v-else-if="tc.state === 'suspended'"
					placement="top"
					content="Waiting for your input"
				>
					<N8nIcon icon="clock" :size="14" :class="$style.toolStepSuspended" />
				</N8nTooltip>
				<N8nIcon
					v-else
					icon="loader-circle"
					:size="14"
					:spin="true"
					:class="$style.toolStepLoading"
				/>
			</div>
			<span :class="$style.toolStepLabel">{{ formatToolNameForDisplay(tc.tool) }}</span>
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
	margin: 0 0 var(--spacing--2xs);
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toolStep {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	position: relative;
}

.toolStepIndicator {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	height: 14px;
	flex-shrink: 0;
	color: var(--color--text--tint-2);
}

.toolStep:not(:last-child) .toolStepIndicator::after {
	content: '';
	position: absolute;
	top: calc(100% + 1px);
	left: 50%;
	width: 1px;
	height: var(--spacing--2xs);
	transform: translateX(-50%);
	background-color: var(--color--foreground);
}

.toolStepDone {
	color: var(--color--success);
}

.toolStepError {
	color: var(--color--danger);
}

.toolStepLoading {
	color: var(--color--primary);
}

.toolStepSuspended {
	color: var(--color--warning);
}

.toolStepLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.toolStepSummary {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--2xs);
	margin-left: var(--spacing--3xs);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
