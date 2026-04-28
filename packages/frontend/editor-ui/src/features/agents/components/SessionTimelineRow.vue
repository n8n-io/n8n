<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { VIEWS } from '@/app/constants/navigation';
import type { TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey, kindColorToken } from '../session-timeline.utils';

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
			return truncate(it.content ?? '', 120);
		case 'tool': {
			const key = builtinToolLabelKey(it.toolName);
			return key ? i18n.baseText(key) : (it.toolName ?? '');
		}
		case 'workflow':
			return it.workflowName ?? it.toolName ?? '';
		case 'node':
			return it.nodeDisplayName ?? it.toolName ?? '';
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

const pillStyle = computed(() => {
	const color = kindColorToken(props.item.kind);
	return {
		backgroundColor: `color-mix(in srgb, ${color} 40%, transparent)`,
		color,
	};
});

const rowBorderColor = computed(() => {
	const color = kindColorToken(props.item.kind);
	return `color-mix(in srgb, ${color} 45%, transparent)`;
});
</script>

<template>
	<div
		:class="[$style.row, selected && $style.selected]"
		:style="{ borderLeftColor: rowBorderColor }"
		@click="emit('select')"
	>
		<span :class="$style.pill" :style="pillStyle">{{ label }}</span>
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
	/* Fixed pill column wide enough to fit the widest label ("Workflow",
	   "Suspended", "Assistant") at 3xs/bold with horizontal padding. */
	grid-template-columns: 88px 1fr auto;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-left: 3px solid transparent;
	cursor: pointer;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.selected {
	background-color: var(--color--foreground--tint-2);
	outline: 2px solid var(--color--warning);
	outline-offset: -2px;
}

.pill {
	/* justify-self: start keeps the pill anchored to the left of the fixed
	   pill column; the inline-flex sizes the pill to its text content only. */
	justify-self: start;
	display: inline-flex;
	align-items: center;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
	white-space: nowrap;
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
