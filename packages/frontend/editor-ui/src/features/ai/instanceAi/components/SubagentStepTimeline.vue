<script lang="ts" setup>
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { N8nButton, N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import { computed } from 'vue';
import { getToolIcon, useToolLabel } from '../toolLabels';
import ButtonLike from './ButtonLike.vue';
import DataSection from './DataSection.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import ToolCallStep from './ToolCallStep.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const { getToolLabel, getToggleLabel, getHideLabel } = useToolLabel();

const CODE_BLOCK_PATTERN = /```/;

/** Tool calls that are internal and should not be shown in the step timeline. */
const HIDDEN_TOOLS = new Set(['updateWorkingMemory']);

interface TimelineStep {
	type: 'tool-call' | 'text' | 'done';
	icon: IconName;
	label: string;
	isLoading: boolean;
	toggleLabel?: string;
	hideLabel?: string;
	toolCall?: InstanceAiToolCallState;
	textContent?: string;
	isLongText?: boolean;
	shortLabel?: string;
}

function extractShortLabel(content: string): string {
	// Strip code blocks and return first meaningful line
	const withoutCode = content.replace(/```[\s\S]*?```/g, '').trim();
	const firstLine = withoutCode.split('\n').find((line) => line.trim().length > 0) ?? '';
	if (firstLine) {
		return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
	}
	// Content is only code blocks (e.g. generated workflow code)
	return i18n.baseText('instanceAi.stepTimeline.craftingWorkflow');
}

function isLongTextContent(content: string): boolean {
	return CODE_BLOCK_PATTERN.test(content);
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
			if (!tc || HIDDEN_TOOLS.has(tc.toolName)) continue;
			result.push({
				type: 'tool-call',
				icon: tc.isLoading ? 'spinner' : getToolIcon(tc.toolName),
				label: getToolLabel(tc.toolName, tc.args),
				isLoading: tc.isLoading,
				toggleLabel: getToggleLabel(tc),
				hideLabel: getHideLabel(tc),
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
		<template v-for="(step, idx) in steps" :key="idx">
			<!-- Tool call: rendered via ToolCallStep (has its own icon column) -->
			<ToolCallStep
				v-if="step.type === 'tool-call' && step.toolCall"
				:tool-call="step.toolCall"
				:label="step.label"
				:show-connector="idx < steps.length - 1"
			/>

			<template v-else-if="step.type === 'text'">
				<CollapsibleRoot v-if="step.isLongText" v-slot="{ open }">
					<CollapsibleTrigger as-child>
						<N8nButton ref="triggerRef" variant="ghost" size="small">
							<template #icon>
								<template v-if="step.isLoading">
									<N8nIcon icon="spinner" size="small" color="primary" spin />
								</template>
								<N8nIcon v-else :icon="step.icon" size="small" />
							</template>
							<template v-if="open">
								{{ i18n.baseText('instanceAi.statusBar.thinking') }}
							</template>
							<template v-else>{{ step.label }}</template>
						</N8nButton>
					</CollapsibleTrigger>
					<AnimatedCollapsibleContent :class="$style.toggleContent">
						<DataSection>
							<InstanceAiMarkdown :content="step.textContent!" />
						</DataSection>
					</AnimatedCollapsibleContent>
				</CollapsibleRoot>
				<ButtonLike v-else>
					<N8nIcon :icon="step.icon" size="small" />
					{{ step.label }}
				</ButtonLike>
			</template>

			<ButtonLike v-else-if="step.type === 'done'">
				<N8nIcon :icon="step.icon" size="small" />
				{{ step.label }}
			</ButtonLike>
		</template>
	</div>
</template>

<style lang="scss" module>
.timeline {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toggleContent {
	max-height: 300px;
	overflow-y: auto;
}
</style>
