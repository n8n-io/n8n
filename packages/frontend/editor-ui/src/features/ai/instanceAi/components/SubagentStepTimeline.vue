<script lang="ts" setup>
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { N8nButton, N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed } from 'vue';
import { getToolIcon, useToolLabel } from '../toolLabels';
import {
	isStreamingTimelineEntry,
	isVisibleTimelineEntry,
	coalesceConsecutiveReasoning,
} from '../agentTimeline.utils';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import ButtonLike from './ButtonLike.vue';
import DataSection from './DataSection.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import TimelineReasoningSegment from './TimelineReasoningSegment.vue';
import ToolCallStep from './ToolCallStep.vue';

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
const { getToolLabel } = useToolLabel();

const CODE_BLOCK_PATTERN = /```/;

/** Tool calls that are internal and should not be shown in the step timeline. */
const HIDDEN_TOOLS = new Set(['updateWorkingMemory']);

function extractShortLabel(content: string): string {
	const withoutCode = content.replace(/```[\s\S]*?```/g, '').trim();
	const firstLine = withoutCode.split('\n').find((line) => line.trim().length > 0) ?? '';
	if (firstLine) {
		return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
	}
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

const timelineEntries = computed(() =>
	coalesceConsecutiveReasoning(props.visibleEntries ?? props.agentNode.timeline),
);

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
	return map;
});

function entryIsVisible(entry: InstanceAiTimelineEntry): boolean {
	return isVisibleTimelineEntry(props.agentNode, entry, toolCallsById.value, childrenById.value);
}

function getTextIcon(): IconName {
	return 'brain';
}
</script>

<template>
	<div :class="$style.timeline">
		<template v-for="(entry, idx) in timelineEntries" :key="idx">
			<TimelineReasoningSegment
				v-if="entry.type === 'reasoning'"
				:entry="entry"
				:streaming="isStreamingTimelineEntry(props.agentNode, entry, timelineEntries)"
				:peek="props.peek"
			/>

			<ToolCallStep
				v-else-if="
					entry.type === 'tool-call' &&
					toolCallsById[entry.toolCallId] &&
					!HIDDEN_TOOLS.has(toolCallsById[entry.toolCallId].toolName)
				"
				:tool-call="toolCallsById[entry.toolCallId]"
				:label="
					getToolLabel(
						toolCallsById[entry.toolCallId].toolName,
						toolCallsById[entry.toolCallId].args,
					)
				"
				:show-connector="idx < timelineEntries.length - 1"
			/>

			<template v-else-if="entry.type === 'text' && entryIsVisible(entry)">
				<CollapsibleRoot v-if="isLongTextContent(entry.content)" v-slot="{ open }">
					<CollapsibleTrigger as-child>
						<N8nButton ref="triggerRef" variant="ghost" size="small" :class="$style.toggleTrigger">
							<template #icon>
								<N8nIcon :icon="getTextIcon()" size="small" />
							</template>
							<template v-if="open">
								{{ i18n.baseText('instanceAi.statusBar.thinking') }}
							</template>
							<template v-else>{{ extractShortLabel(entry.content) }}</template>
						</N8nButton>
					</CollapsibleTrigger>
					<AnimatedCollapsibleContent :class="$style.toggleContent">
						<DataSection>
							<InstanceAiMarkdown :content="entry.content" />
						</DataSection>
					</AnimatedCollapsibleContent>
				</CollapsibleRoot>
				<ButtonLike v-else>
					<div v-if="props.peek" :class="$style.streamingMarkdown">
						<InstanceAiMarkdown :content="entry.content" />
					</div>
					<InstanceAiMarkdown v-else :content="entry.content" />
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
