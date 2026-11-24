<script lang="ts" setup>
import {
	N8nButton,
	N8nIcon,
	N8nAnimatedCollapsibleContent as AnimatedCollapsibleContent,
	N8nAiActivityStepResultSection,
} from '@n8n/design-system';
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { useNow } from '@vueuse/core';
import { computed } from 'vue';
import type { AgentTestTarget } from '@/features/agents/utils/agentTestUrl';
import { useActiveToolLabel } from '../composables/useRunActivity';
import { HIDDEN_TOOLS, isStreamingTimelineEntry } from '../agentTimeline.utils';
import { useToolLabel } from '../toolLabels';
import { AiActivityTrace, type AiActivityItem } from '../../shared/components/AiActivityTrace';
import { firstSentence } from '../../shared/thinking.utils';
import ButtonLike from './ButtonLike.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		agentPreviewTarget?: AgentTestTarget;
		/** When provided, renders only these entries instead of the full timeline. */
		visibleEntries?: InstanceAiTimelineEntry[];
		/** Peek mode: compact, pins streaming text to the bottom. */
		peek?: boolean;
	}>(),
	{ visibleEntries: undefined, peek: false },
);

const i18n = useI18n();
const { getToolLabel } = useToolLabel();
const activeToolLabel = useActiveToolLabel();
/** A running source write rotates its label, so the label reads the clock. */
const now = useNow({ interval: 1000 });

const CODE_BLOCK_PATTERN = /```/;

/** Adjacent reasoning and tool calls. The shared trace renders them and groups the tool calls. */
interface TraceBlock {
	kind: 'trace';
	id: string;
	items: Array<AiActivityItem<InstanceAiToolCallState>>;
}

/** Narration text of the sub-agent. It shows between traces. */
interface TextBlock {
	kind: 'text';
	id: string;
	label: string;
	content: string;
	isLongText: boolean;
}

type TimelineBlock = TraceBlock | TextBlock;

function extractShortLabel(content: string): string {
	/** Remove code blocks and use the first line that has text. */
	const withoutCode = content.replace(/```[\s\S]*?```/g, '').trim();
	const firstLine = withoutCode.split('\n').find((line) => line.trim().length > 0) ?? '';
	if (firstLine) {
		return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
	}
	/** The content has only code blocks, for example generated workflow code. */
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

/** A stopped sub-agent can keep a call that still loads. That call keeps the plain label. */
function toolCallLabel(tc: InstanceAiToolCallState): string {
	return tc.isLoading && props.agentNode.status === 'active'
		? activeToolLabel(tc, props.agentNode, now.value.getTime())
		: getToolLabel(tc.toolName, tc.args);
}

function toTraceItem(
	entry: InstanceAiTimelineEntry,
	idx: number,
): AiActivityItem<InstanceAiToolCallState> | undefined {
	if (entry.type === 'reasoning') {
		return {
			kind: 'thinking',
			id: `reasoning-${idx}`,
			segments: [entry],
			active: isStreamingTimelineEntry(props.agentNode, entry),
			settledLabel: firstSentence(entry.content) || undefined,
			testId: 'instance-ai-subagent-thinking',
		};
	}
	if (entry.type !== 'tool-call') return undefined;
	const tc = toolCallsById.value[entry.toolCallId];
	if (!tc || HIDDEN_TOOLS.has(tc.toolName)) return undefined;
	return {
		kind: 'tool',
		id: tc.toolCallId,
		label: toolCallLabel(tc),
		toolName: tc.toolName,
		loading: tc.isLoading,
		error: tc.error,
		input: tc.args ?? undefined,
		output: tc.result,
		payload: tc,
	};
}

const blocks = computed((): TimelineBlock[] => {
	const result: TimelineBlock[] = [];
	let trace: TraceBlock | undefined;

	timelineEntries.value.forEach((entry, idx) => {
		if (entry.type === 'text') {
			trace = undefined;
			const isLongText = isLongTextContent(entry.content);
			result.push({
				kind: 'text',
				id: `text-${idx}`,
				label: isLongText ? extractShortLabel(entry.content) : entry.content,
				content: entry.content,
				isLongText,
			});
			return;
		}
		/** Child entries are skipped. The parent AgentTimeline renders child cards. */
		const item = toTraceItem(entry, idx);
		if (!item) return;
		if (!trace) {
			trace = { kind: 'trace', id: `trace-${idx}`, items: [] };
			result.push(trace);
		}
		trace.items.push(item);
	});

	return result;
});
</script>

<template>
	<div :class="$style.timeline">
		<template v-for="block in blocks" :key="block.id">
			<AiActivityTrace v-if="block.kind === 'trace'" :items="block.items" />

			<CollapsibleRoot v-else-if="block.isLongText" v-slot="{ open }">
				<CollapsibleTrigger as-child>
					<N8nButton variant="ghost" size="small" :class="$style.toggleTrigger">
						<template #icon>
							<N8nIcon icon="brain" size="small" />
						</template>
						<template v-if="open">
							{{ i18n.baseText('instanceAi.statusBar.thinking') }}
						</template>
						<template v-else>{{ block.label }}</template>
					</N8nButton>
				</CollapsibleTrigger>
				<AnimatedCollapsibleContent :class="$style.toggleContent">
					<N8nAiActivityStepResultSection>
						<InstanceAiMarkdown
							:content="block.content"
							:agent-preview-target="props.agentPreviewTarget"
						/>
					</N8nAiActivityStepResultSection>
				</AnimatedCollapsibleContent>
			</CollapsibleRoot>

			<ButtonLike v-else>
				<!-- Peek mode only: column-reverse + overflow-y pins the scroll
					 to the bottom so the latest streamed tokens stay visible. -->
				<div v-if="props.peek" :class="$style.streamingMarkdown">
					<InstanceAiMarkdown
						:content="block.label"
						:agent-preview-target="props.agentPreviewTarget"
					/>
				</div>
				<InstanceAiMarkdown
					v-else
					:content="block.label"
					:agent-preview-target="props.agentPreviewTarget"
				/>
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

.toggleTrigger {
	--button--padding: 0;
	--button--font-size: var(--n8n-markdown--font-size--base, var(--font-size--sm));

	padding-inline: 0;
	font-size: var(--n8n-markdown--font-size--base, var(--font-size--sm));
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
