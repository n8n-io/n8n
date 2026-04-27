<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import SessionTimelineRow from './SessionTimelineRow.vue';
import type { TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey, itemFilterKey } from '../session-timeline.utils';

const props = defineProps<{
	items: TimelineItem[];
	selectedIndex: number | null;
	visibleKinds: Set<string>;
	searchQuery?: string;
}>();

const emit = defineEmits<{ select: [index: number] }>();

const i18n = useI18n();

/**
 * Build the haystack of searchable text per item — includes the pill label
 * (e.g. "Workflow", "Agent"), the built-in display name (e.g. "Feedback
 * requested from user"), the raw tool/workflow name, and any free text content.
 * Lowercased once for case-insensitive substring matching.
 */
function searchableText(item: TimelineItem): string {
	const parts: Array<string | undefined> = [];

	// Pill / kind label
	switch (item.kind) {
		case 'user':
			parts.push(i18n.baseText('agentSessions.timeline.user'));
			break;
		case 'agent':
			parts.push(i18n.baseText('agentSessions.timeline.agent'));
			break;
		case 'tool':
			parts.push(i18n.baseText('agentSessions.timeline.tool'));
			break;
		case 'workflow':
			parts.push(i18n.baseText('agentSessions.timeline.workflow'));
			break;
		case 'working-memory':
			parts.push(i18n.baseText('agentSessions.timeline.memory'));
			parts.push(i18n.baseText('agentSessions.timeline.memoryUpdated'));
			break;
		case 'suspension':
			parts.push(i18n.baseText('agentSessions.timeline.suspended'));
			parts.push(i18n.baseText('agentSessions.timeline.waitingForUser'));
			break;
	}

	// Free text + raw identifiers
	parts.push(item.content, item.toolName, item.workflowName);

	// Built-in tool friendly label
	const toolKey = builtinToolLabelKey(item.toolName);
	if (toolKey) parts.push(i18n.baseText(toolKey));

	return parts
		.filter((p): p is string => typeof p === 'string')
		.join(' ')
		.toLowerCase();
}

function matchesSearch(item: TimelineItem, query: string): boolean {
	if (!query) return true;
	return searchableText(item).includes(query.toLowerCase());
}

const rows = computed(() =>
	props.items
		.map((item, index) => ({ item, index }))
		.filter(
			({ item }) =>
				(props.visibleKinds.size === 0 || props.visibleKinds.has(itemFilterKey(item))) &&
				matchesSearch(item, (props.searchQuery ?? '').trim()),
		),
);
</script>

<template>
	<div :class="$style.table">
		<div
			v-for="{ item, index } in rows"
			:key="index"
			data-test-id="timeline-row"
			@click="emit('select', index)"
		>
			<SessionTimelineRow :item="item" :selected="props.selectedIndex === index" />
		</div>
	</div>
</template>

<style module lang="scss">
.table {
	display: flex;
	flex-direction: column;
}
</style>
