<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import SessionTimelineRow from './SessionTimelineRow.vue';
import type { IdleRange, TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey, formatDuration, itemFilterKey } from '../session-timeline.utils';

const props = defineProps<{
	items: TimelineItem[];
	selectedIndex: number | null;
	visibleKinds: Set<string>;
	searchQuery?: string;
	idleRanges?: IdleRange[];
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
		case 'node':
			parts.push(i18n.baseText('agentSessions.timeline.node'));
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
	parts.push(item.content, item.toolName, item.workflowName, item.nodeDisplayName);

	// Built-in tool friendly label
	const toolKey = builtinToolLabelKey(item.toolName, item.toolOutput);
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

type Row =
	| { kind: 'event'; item: TimelineItem; index: number; sortKey: number }
	| { kind: 'idle'; range: IdleRange; sortKey: number };

const rows = computed<Row[]>(() => {
	const events: Row[] = props.items
		.map((item, index) => ({ item, index }))
		.filter(
			({ item }) =>
				(props.visibleKinds.size === 0 || props.visibleKinds.has(itemFilterKey(item))) &&
				matchesSearch(item, (props.searchQuery ?? '').trim()),
		)
		.map(({ item, index }) => ({ kind: 'event', item, index, sortKey: item.timestamp }));

	const idles: Row[] = (props.idleRanges ?? []).map((range) => ({
		kind: 'idle',
		range,
		sortKey: range.start,
	}));

	return [...events, ...idles].sort((a, b) => a.sortKey - b.sortKey);
});
</script>

<template>
	<div :class="$style.table">
		<template v-for="(row, idx) in rows" :key="idx">
			<div
				v-if="row.kind === 'event'"
				data-test-id="timeline-row"
				@click="emit('select', row.index)"
			>
				<SessionTimelineRow :item="row.item" :selected="props.selectedIndex === row.index" />
			</div>
			<div v-else data-test-id="timeline-idle-row" :class="$style.idleRow">
				<span :class="$style.idlePill">
					{{ i18n.baseText('agentSessions.timeline.idle') }} ·
					{{ formatDuration(row.range.end - row.range.start) }}
				</span>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.table {
	display: flex;
	flex-direction: column;
}

.idleRow {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xs) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	/* Match the chart's idle styling — striped 45° gradient. */
	background-image: repeating-linear-gradient(
		45deg,
		var(--color--foreground--shade-1) 0 4px,
		transparent 4px 8px
	);
}

.idlePill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
	/* Page-bg fill so the pill stands out against the striped row backdrop,
	   mirroring the .idleFill treatment on the chart. */
	background-color: var(--color--background);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: lowercase;
	letter-spacing: 0.02em;
	white-space: nowrap;
}
</style>
