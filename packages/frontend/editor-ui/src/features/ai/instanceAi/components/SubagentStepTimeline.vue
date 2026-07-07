<script lang="ts" setup>
import {
	N8nButton,
	N8nIcon,
	type IconName,
	N8nAnimatedCollapsibleContent as AnimatedCollapsibleContent,
	N8nAiActivityStep as ToolCallStep,
	N8nAiActivityStepResultSection,
} from '@n8n/design-system';
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed } from 'vue';
import { getToolIcon, useToolLabel } from '../toolLabels';
import ButtonLike from './ButtonLike.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		/** When provided, renders only these entries instead of the full timeline. */
		visibleEntries?: InstanceAiTimelineEntry[];
		/** Peek mode: compact, pins streaming text to the bottom. */
		peek?: boolean;
	}>(),
	{ visibleEntries: undefined, peek: false },
);

const i18n = useI18n();
const { getToolLabel, getToggleLabel, getHideLabel } = useToolLabel();

const CODE_BLOCK_PATTERN = /```/;

/** Tool calls that are internal and should not be shown in the step timeline. */
const HIDDEN_TOOLS = new Set(['updateWorkingMemory']);

interface TimelineStep {
	type: 'tool-call' | 'text';
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

const timelineEntries = computed(() => props.visibleEntries ?? props.agentNode.timeline);

const steps = computed((): TimelineStep[] => {
	const result: TimelineStep[] = [];

	for (const entry of timelineEntries.value) {
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
		// Skip 'child' entries (parent AgentTimeline handles child cards) and
		// 'reasoning' entries (sub-agent reasoning is not surfaced in this view)
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
				:label="step.label"
				:loading="step.toolCall.isLoading"
				:error="step.toolCall.error"
			>
				<ToolResultJson v-if="step.toolCall.args" :value="step.toolCall.args" />
				<ToolResultRenderer
					v-if="step.toolCall.result !== undefined"
					:result="step.toolCall.result"
					:tool-name="step.toolCall.toolName"
					:tool-args="step.toolCall.args"
				/>
			</ToolCallStep>

			<template v-else-if="step.type === 'text'">
				<CollapsibleRoot v-if="step.isLongText" v-slot="{ open }">
					<CollapsibleTrigger as-child>
						<N8nButton ref="triggerRef" variant="ghost" size="small" :class="$style.toggleTrigger">
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
						<N8nAiActivityStepResultSection>
							<InstanceAiMarkdown :content="step.textContent!" />
						</N8nAiActivityStepResultSection>
					</AnimatedCollapsibleContent>
				</CollapsibleRoot>
				<ButtonLike v-else>
					<!-- Peek mode only: column-reverse + overflow-y pins the scroll
						 to the bottom so the latest streamed tokens stay visible. -->
					<div v-if="props.peek" :class="$style.streamingMarkdown">
						<InstanceAiMarkdown :content="step.label" />
					</div>
					<InstanceAiMarkdown v-else :content="step.label" />
				</ButtonLike>
			</template>
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

.toggleTrigger {
	--button--padding: 0;
	--button--font-size: var(--font-size--sm);

	padding-inline: 0;
	font-size: var(--font-size--sm);
}

.streamingMarkdown {
	display: flex;
	flex-direction: column-reverse;
	overflow-y: auto;
	max-height: 120px;
	flex: 1 1 auto;
	min-width: 0;
	scrollbar-width: none;
}
</style>
