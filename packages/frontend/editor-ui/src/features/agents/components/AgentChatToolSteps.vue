<script setup lang="ts">
import AnimatedCollapsibleContent from '@/features/ai/instanceAi/components/AnimatedCollapsibleContent.vue';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import type { ToolCall } from '../composables/agentChatMessages';
import { formatToolNameForDisplay, getToolNameTranslationKey } from '../utils/toolDisplayName';

const props = defineProps<{
	toolCalls: ToolCall[];
}>();

const i18n = useI18n();

function getToolDisplayName(toolName: string): string {
	const translationKey = getToolNameTranslationKey(toolName);
	return translationKey ? i18n.baseText(translationKey) : formatToolNameForDisplay(toolName);
}

function hasToolData(tc: ToolCall): boolean {
	return tc.input !== undefined || tc.output !== undefined;
}

function formatToolData(value: unknown): string {
	if (typeof value === 'string') return value;
	const json = JSON.stringify(value, null, 2);
	return json ?? String(value);
}
</script>

<template>
	<ol :class="$style.toolSteps">
		<li
			v-for="(tc, index) in props.toolCalls"
			:key="tc.toolCallId || `${tc.tool}-${index}`"
			:class="$style.toolStep"
		>
			<CollapsibleRoot v-slot="{ open: isOpen }" :default-open="false" :disabled="!hasToolData(tc)">
				<div :class="$style.toolStepRow">
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
							:content="i18n.baseText('instanceAi.statusBar.waitingForInput')"
						>
							<N8nIcon icon="clock" size="large" :class="$style.toolStepSuspended" />
						</N8nTooltip>
						<N8nIcon
							v-else
							icon="spinner"
							size="large"
							:spin="true"
							:class="$style.toolStepLoading"
						/>
					</div>

					<CollapsibleTrigger v-if="hasToolData(tc)" as-child>
						<button type="button" :class="$style.toolStepTrigger">
							<span :class="$style.toolStepText">
								<span :class="[$style.toolStepLabel, { [$style.shimmer]: tc.state === 'running' }]">
									{{ getToolDisplayName(tc.tool) }}
								</span>
								<span
									v-if="tc.displaySummary"
									:class="$style.toolStepSummary"
									data-testid="tool-step-summary"
								>
									· {{ tc.displaySummary }}
								</span>
							</span>
							<N8nIcon
								icon="chevron-right"
								size="small"
								:class="[$style.toolStepChevron, { [$style.toolStepChevronOpen]: isOpen }]"
							/>
						</button>
					</CollapsibleTrigger>

					<template v-else>
						<span :class="[$style.toolStepLabel, { [$style.shimmer]: tc.state === 'running' }]">
							{{ getToolDisplayName(tc.tool) }}
						</span>
						<span
							v-if="tc.displaySummary"
							:class="$style.toolStepSummary"
							data-testid="tool-step-summary"
						>
							· {{ tc.displaySummary }}
						</span>
					</template>
				</div>

				<AnimatedCollapsibleContent v-if="hasToolData(tc)">
					<div :class="$style.toolStepDataList">
						<div v-if="tc.input !== undefined" :class="$style.toolStepDataSection">
							<span :class="$style.toolStepDataLabel">
								{{ i18n.baseText('agentSessions.timeline.input') }}
							</span>
							<pre :class="$style.toolStepDataContent">{{ formatToolData(tc.input) }}</pre>
						</div>
						<div v-if="tc.output !== undefined" :class="$style.toolStepDataSection">
							<span :class="$style.toolStepDataLabel">
								{{ i18n.baseText('agentSessions.timeline.output') }}
							</span>
							<pre :class="$style.toolStepDataContent">{{ formatToolData(tc.output) }}</pre>
						</div>
					</div>
				</AnimatedCollapsibleContent>
			</CollapsibleRoot>
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
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--4xs);
	position: relative;
	user-select: none;
}

.toolStepRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
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

.toolStepText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	overflow: hidden;
	min-width: 0;
}

.toolStepTrigger {
	border: 0;
	background: transparent;
	padding: 0;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	color: inherit;
}

.toolStepChevron {
	color: var(--text-color--subtler);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
}

.toolStepChevronOpen {
	transform: rotate(90deg);
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

.toolStepDataList {
	margin-left: calc(14px + var(--spacing--2xs));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-width: min(520px, calc(100vw - var(--spacing--4xl)));
}

.toolStepDataSection {
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--xs);
	background-color: var(--background--base);
	padding: var(--spacing--2xs);
}

.toolStepDataLabel {
	display: block;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtle);
	margin-bottom: var(--spacing--5xs);
}

.toolStepDataContent {
	margin: 0;
	font-family: monospace;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	color: var(--text-color);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
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

@media (prefers-reduced-motion: reduce) {
	.toolStepChevron {
		transition: none;
	}
}
</style>
