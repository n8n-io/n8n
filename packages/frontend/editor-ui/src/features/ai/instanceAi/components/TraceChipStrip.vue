<script lang="ts" setup>
import type { InstanceAiAgentNode, InstanceAiTimelineEntry } from '@n8n/api-types';
import type { AiTraceChipItem } from '@n8n/design-system';
import { N8nAiTraceChips } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { isStreamingTimelineEntry } from '../agentTimeline.utils';
import { getToolIcon, useToolLabel } from '../toolLabels';
import TraceChipPanel, { type TraceChipSource } from './TraceChipPanel.vue';

/**
 * Renders a consecutive run of trace entries (reasoning + generic tool calls)
 * as a horizontal strip of icon chips with a shared, single-expansion detail
 * panel. The heavy per-entry content (args, results, reasoning text) only
 * renders for the expanded chip.
 */
const props = defineProps<{
	agentNode: InstanceAiAgentNode;
	entries: InstanceAiTimelineEntry[];
}>();

const i18n = useI18n();
const { getToolLabel } = useToolLabel();

const expandedId = ref<string | null>(null);

/** Chip id → panel source. Reasoning entries have no own id; index them. */
const sourcesById = computed(() => {
	const map = new Map<string, TraceChipSource>();
	props.entries.forEach((entry, idx) => {
		if (entry.type === 'reasoning') {
			map.set(`reasoning-${idx}`, { kind: 'reasoning', entry });
		} else if (entry.type === 'tool-call') {
			const toolCall = props.agentNode.toolCalls.find((tc) => tc.toolCallId === entry.toolCallId);
			if (toolCall) map.set(toolCall.toolCallId, { kind: 'tool-call', toolCall });
		}
	});
	return map;
});

const chips = computed<AiTraceChipItem[]>(() => {
	const items: AiTraceChipItem[] = [];
	props.entries.forEach((entry, idx) => {
		if (entry.type === 'reasoning') {
			items.push({
				id: `reasoning-${idx}`,
				icon: 'brain',
				label: i18n.baseText('instanceAi.message.reasoning'),
				loading: isStreamingTimelineEntry(props.agentNode, entry),
			});
		} else if (entry.type === 'tool-call') {
			const source = sourcesById.value.get(entry.toolCallId);
			if (source?.kind !== 'tool-call') return;
			const { toolCall } = source;
			items.push({
				id: toolCall.toolCallId,
				icon: getToolIcon(toolCall.toolName),
				label: getToolLabel(toolCall.toolName, toolCall.args),
				loading: toolCall.isLoading,
				error: toolCall.error,
			});
		}
	});
	return items;
});
</script>

<template>
	<N8nAiTraceChips v-model:expanded-id="expandedId" :items="chips">
		<template #panel="{ item }">
			<TraceChipPanel :source="sourcesById.get(item.id)" />
		</template>
	</N8nAiTraceChips>
</template>
