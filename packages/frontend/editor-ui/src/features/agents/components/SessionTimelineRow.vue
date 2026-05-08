<script lang="ts" setup>
import { N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { VIEWS } from '@/app/constants/navigation';
import type { TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey } from '../session-timeline.utils';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import SessionTimelinePill from './SessionTimelinePill.vue';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
}>();

const emit = defineEmits<{ select: [] }>();

const router = useRouter();
const i18n = useI18n();

const time = computed((): string => {
	if (!props.item.timestamp) return '';
	return convertToDisplayDate(new Date(props.item.timestamp).toISOString()).time;
});

const workflowHref = computed((): string => {
	if (props.item.kind !== 'workflow' || !props.item.workflowId) return '';
	return router.resolve({ name: VIEWS.WORKFLOW, params: { name: props.item.workflowId } }).href;
});

const infoText = computed((): string => {
	const it = props.item;
	switch (it.kind) {
		case 'user':
		case 'agent':
			return truncate(it.content ?? '', 500);
		case 'tool': {
			const key = builtinToolLabelKey(it.toolName, it.toolOutput);
			return key ? i18n.baseText(key) : formatToolNameForDisplay(it.toolName);
		}
		case 'workflow':
			return it.workflowName ?? formatToolNameForDisplay(it.toolName);
		case 'node':
			return it.nodeDisplayName ?? formatToolNameForDisplay(it.toolName);
		case 'working-memory':
			return i18n.baseText('agentSessions.timeline.memoryUpdated');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.waitingForUser');
		default:
			return '';
	}
});

const label = computed((): string => {
	switch (props.item.kind) {
		case 'user':
			return i18n.baseText('agentSessions.timeline.user');
		case 'agent':
			return i18n.baseText('agentSessions.timeline.agent');
		case 'tool':
			return i18n.baseText('agentSessions.timeline.tool');
		case 'workflow':
			return i18n.baseText('agentSessions.timeline.workflow');
		case 'node':
			return i18n.baseText('agentSessions.timeline.node');
		case 'working-memory':
			return i18n.baseText('agentSessions.timeline.memory');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.suspended');
		default:
			return '';
	}
});
</script>

<template>
	<div :class="[$style.row, selected && $style.selected]" @click="emit('select')">
		<N8nTooltip :content="label" placement="top">
			<SessionTimelinePill :kind="item.kind" />
		</N8nTooltip>
		<div :class="$style.info">
			<template v-if="item.kind === 'workflow' && workflowHref">
				<a
					:href="workflowHref"
					target="_blank"
					rel="noopener"
					:class="$style.workflowLink"
					@click.stop
					>{{ infoText }}</a
				>
			</template>
			<template v-else>
				<span>{{ infoText }}</span>
			</template>
		</div>
		<span :class="$style.time">{{ time }}</span>
	</div>
</template>

<style module lang="scss">
.row {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	height: var(--height--xl);
	cursor: pointer;
	font-size: var(--font-size--sm);
	border-radius: var(--radius--3xs);

	&:hover {
		background-color: var(--background--hover);
	}
}

.selected {
	background-color: var(--background--active);
}

.info {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	color: var(--color--text);
	overflow: hidden;
	white-space: nowrap;

	/* Apply ellipsis to text spans, not the flex container — the container's
	   overflow:hidden combined with a tight line-box was clipping descenders. */
	> span {
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: var(--line-height--sm);
	}
}

.workflowLink {
	color: var(--color--primary);
	text-decoration: underline;
}

.time {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}
</style>
