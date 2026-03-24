<script lang="ts" setup>
import { computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { useToolLabel } from '../toolLabels';
import ToolResultRenderer from './ToolResultRenderer.vue';
import ToolResultJson from './ToolResultJson.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const { getToolLabel } = useToolLabel();

const CODE_BLOCK_PATTERN = /```/;

interface TimelineStep {
	type: 'tool-call' | 'text' | 'done';
	icon: IconName;
	label: string;
	isLoading: boolean;
	toggleLabel?: string;
	toolCall?: InstanceAiToolCallState;
	textContent?: string;
	isLongText?: boolean;
	shortLabel?: string;
}

function extractShortLabel(content: string): string {
	// Strip code blocks and return first meaningful line
	const withoutCode = content.replace(/```[\s\S]*?```/g, '').trim();
	const firstLine = withoutCode.split('\n').find((line) => line.trim().length > 0) ?? '';
	return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
}

function isLongTextContent(content: string): boolean {
	return CODE_BLOCK_PATTERN.test(content);
}

const NO_TOGGLE_TOOLS = new Set(['updateWorkingMemory', 'plan', 'cancel-background-task']);

function getToolIcon(toolName: string): IconName {
	if (toolName === 'delegate' || toolName.endsWith('-with-agent')) return 'share';
	if (toolName.includes('data-table')) return 'table';
	if (
		toolName.includes('workflow') ||
		toolName === 'search-nodes' ||
		toolName.startsWith('get-node') ||
		toolName === 'submit-workflow' ||
		toolName === 'run-workflow' ||
		toolName === 'activate-workflow' ||
		toolName === 'list-nodes' ||
		toolName === 'explore-node-resources' ||
		toolName === 'get-suggested-nodes' ||
		toolName === 'list-executions' ||
		toolName === 'get-execution' ||
		toolName === 'debug-execution' ||
		toolName === 'stop-execution' ||
		toolName === 'materialize-node-type'
	) {
		return 'workflow';
	}
	if (toolName === 'web-search' || toolName === 'fetch-url') return 'search';
	if (toolName === 'updateWorkingMemory' || toolName === 'plan') return 'brain';
	if (toolName.includes('credential') || toolName === 'browser-credential-setup')
		return 'key-round';
	return 'settings';
}

function getToggleLabel(toolCall: InstanceAiToolCallState): string | undefined {
	if (NO_TOGGLE_TOOLS.has(toolCall.toolName)) return undefined;
	if (toolCall.toolName === 'delegate') {
		return i18n.baseText('instanceAi.stepTimeline.showBrief');
	}
	return i18n.baseText('instanceAi.stepTimeline.showData');
}

/** Index tool calls by ID for O(1) lookup. */
const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	return map;
});

const steps = computed((): TimelineStep[] => {
	const result: TimelineStep[] = [];

	for (const entry of props.agentNode.timeline) {
		if (entry.type === 'text') {
			const longText = isLongTextContent(entry.content);
			result.push({
				type: 'text',
				icon: 'brain',
				label: longText ? extractShortLabel(entry.content) : entry.content,
				isLoading: false,
				textContent: entry.content,
				isLongText: longText,
				shortLabel: longText ? extractShortLabel(entry.content) : undefined,
			});
		} else if (entry.type === 'tool-call') {
			const tc = toolCallsById.value[entry.toolCallId];
			if (!tc) continue;
			result.push({
				type: 'tool-call',
				icon: tc.isLoading ? 'spinner' : getToolIcon(tc.toolName),
				label: getToolLabel(tc.toolName),
				isLoading: tc.isLoading,
				toggleLabel: getToggleLabel(tc),
				toolCall: tc,
			});
		}
		// Skip 'child' entries — parent AgentTimeline handles child cards
	}

	if (props.agentNode.status === 'completed') {
		result.push({
			type: 'done',
			icon: 'circle-check',
			label: i18n.baseText('instanceAi.stepTimeline.done'),
			isLoading: false,
		});
	}

	return result;
});
</script>

<template>
	<div :class="$style.timeline">
		<div v-for="(step, idx) in steps" :key="idx" :class="$style.step">
			<div :class="$style.iconColumn">
				<N8nIcon
					:icon="step.icon"
					size="small"
					:spin="step.isLoading"
					:class="[
						$style.stepIcon,
						step.type === 'done' && $style.doneIcon,
						step.isLoading && $style.loadingIcon,
					]"
				/>
				<div v-if="idx < steps.length - 1" :class="$style.connector" />
			</div>
			<div :class="$style.content">
				<!-- Text segment: short inline or long behind toggle -->
				<template v-if="step.type === 'text'">
					<template v-if="step.isLongText">
						<span :class="$style.textLabel">{{ step.shortLabel }}</span>
						<CollapsibleRoot :class="$style.toggleBlock">
							<CollapsibleTrigger :class="$style.toggleButton">
								{{ i18n.baseText('instanceAi.stepTimeline.showData') }}
							</CollapsibleTrigger>
							<CollapsibleContent :class="$style.toggleContent">
								<div :class="$style.dataSection">
									<InstanceAiMarkdown :content="step.textContent!" />
								</div>
							</CollapsibleContent>
						</CollapsibleRoot>
					</template>
					<div v-else :class="$style.textLabel">
						<InstanceAiMarkdown :content="step.textContent!" />
					</div>
				</template>

				<!-- Tool call: label + optional toggle -->
				<template v-else-if="step.type === 'tool-call'">
					<span :class="$style.label">{{ step.label }}</span>
					<CollapsibleRoot v-if="step.toggleLabel" :class="$style.toggleBlock">
						<CollapsibleTrigger :class="$style.toggleButton">
							{{ step.toggleLabel }}
						</CollapsibleTrigger>
						<CollapsibleContent :class="$style.toggleContent">
							<div v-if="step.toolCall?.args" :class="$style.dataSection">
								<ToolResultJson :value="step.toolCall.args" />
							</div>
							<div v-if="step.toolCall?.result !== undefined" :class="$style.dataSection">
								<ToolResultRenderer
									:result="step.toolCall.result"
									:tool-name="step.toolCall.toolName"
								/>
							</div>
							<div
								v-if="step.toolCall?.error !== undefined"
								:class="[$style.dataSection, $style.errorText]"
							>
								{{ step.toolCall.error }}
							</div>
						</CollapsibleContent>
					</CollapsibleRoot>
				</template>

				<!-- Done marker -->
				<template v-else-if="step.type === 'done'">
					<span :class="$style.doneLabel">{{ step.label }}</span>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.timeline {
	display: flex;
	flex-direction: column;
}

.step {
	display: flex;
	gap: var(--spacing--xs);
}

.iconColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 20px;
	flex-shrink: 0;
	padding-top: 2px;
}

.connector {
	width: 1px;
	flex: 1;
	background: var(--color--foreground);
	min-height: 12px;
}

.stepIcon {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.doneIcon {
	color: var(--color--text--tint-2);
}

.loadingIcon {
	color: var(--color--primary);
}

.content {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
	padding-bottom: var(--spacing--2xs);
}

.label {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	line-height: var(--line-height--lg);
}

.textLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--lg);
}

.doneLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
	line-height: var(--line-height--lg);
}

.toggleBlock {
	margin-top: var(--spacing--4xs);
}

.toggleButton {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.toggleContent {
	margin-top: var(--spacing--4xs);
	max-height: 300px;
	overflow-y: auto;
}

.dataSection {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	& + & {
		margin-top: var(--spacing--4xs);
		padding-top: var(--spacing--4xs);
		border-top: 1px dashed var(--color--foreground);
	}
}

.errorText {
	color: var(--color--danger);
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
