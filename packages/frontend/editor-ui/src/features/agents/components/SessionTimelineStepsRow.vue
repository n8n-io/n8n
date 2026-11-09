<script lang="ts" setup>
import { N8nBadge, N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { TimelineItem } from '../session-timeline.types';
import type { TimelineStepGroup } from '../session-timeline-turns';
import { formatDuration, isSubAgentTimelineItem } from '../session-timeline.utils';
import { delegateLabel } from '../utils/delegate-tool';
import { formatToolNameForDisplay, resolveToolNameForDisplay } from '../utils/toolDisplayName';

const props = defineProps<{
	group: TimelineStepGroup;
	items: TimelineItem[];
	open: boolean;
}>();

const i18n = useI18n();

function stepName(item: TimelineItem): string | null {
	switch (item.kind) {
		case 'tool':
			if (isSubAgentTimelineItem(item)) return delegateLabel(i18n, item.subAgentName ?? '');
			return resolveToolNameForDisplay(item.toolName, i18n, item.toolOutput);
		case 'skill':
			return item.skillName ?? resolveToolNameForDisplay(item.toolName, i18n, item.toolOutput);
		case 'workflow':
			return item.workflowName ?? formatToolNameForDisplay(item.toolName);
		case 'node':
			return item.nodeDisplayName ?? formatToolNameForDisplay(item.toolName);
		default:
			return null;
	}
}

const count = computed(() =>
	i18n.baseText('agentSessions.timeline.steps', {
		adjustToNumber: props.group.indexes.length,
		interpolate: { count: String(props.group.indexes.length) },
	}),
);

// What the agent used, once each, in order. Its own narration is left out.
const names = computed(() => {
	const seen = new Set<string>();
	for (const index of props.group.indexes) {
		const name = stepName(props.items[index]);
		if (name) seen.add(name);
	}
	return [...seen].join(', ');
});

const duration = computed(() => formatDuration(props.group.end - props.group.start));
</script>

<template>
	<div :class="$style.row" role="gridcell">
		<N8nIcon :class="$style.chevron" :icon="open ? 'chevron-down' : 'chevron-right'" size="small" />
		<div :class="$style.info">
			<span :class="$style.count">{{ count }}</span>
			<N8nBadge v-if="group.hasError" :class="$style.badge" variant="danger" size="xsmall">
				{{ i18n.baseText('agentSessions.timeline.error') }}
			</N8nBadge>
			<span v-if="names" :class="[$style.names, !group.hasError && $style.afterCount]">{{
				names
			}}</span>
		</div>
		<span :class="$style.duration">{{ duration }}</span>
	</div>
</template>

<style module lang="scss">
.row {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--height--xl);
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--2xs)
		calc(var(--spacing--sm) + var(--spacing--lg));
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	border-radius: var(--radius--3xs);

	&:hover {
		background-color: var(--background--hover);
	}
}

.chevron {
	color: var(--color--text--tint-1);
}

.info {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
}

.count {
	flex-shrink: 0;
	font-weight: var(--font-weight--medium);
}

.names {
	overflow: hidden;
	text-overflow: ellipsis;
}

/* A badge already separates the names from the count. */
.afterCount::before {
	content: '·';
	margin-right: var(--spacing--3xs);
}

.badge {
	flex-shrink: 0;
}

.duration {
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}
</style>
