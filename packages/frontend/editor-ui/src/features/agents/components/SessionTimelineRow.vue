<script lang="ts" setup>
import { N8nIcon, N8nTooltip, type IconName } from '@n8n/design-system';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { VIEWS } from '@/app/constants/navigation';
import type { TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey } from '../session-timeline.utils';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import { rowBorderColor as kindRowBorderColor } from '../session-timeline.styles';

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

const icon = computed((): IconName => {
	switch (props.item.kind) {
		case 'user':
			return 'user';
		case 'agent':
			return 'bot';
		case 'tool':
			return 'wrench';
		case 'workflow':
			return 'workflow';
		case 'node':
			return 'box';
		case 'working-memory':
			return 'brain';
		case 'suspension':
			return 'clock';
		default:
			return 'info';
	}
});

const iconStyle = computed(() => {
	switch (props.item.kind) {
		case 'user':
			return { backgroundColor: 'var(--color--blue-200)', color: 'var(--color--blue-950)' };
		case 'agent':
			return { backgroundColor: 'var(--color--purple-200)', color: 'var(--color--purple-950)' };
		case 'tool':
			return { backgroundColor: 'var(--color--green-200)', color: 'var(--color--green-950)' };
		case 'workflow':
			return { backgroundColor: 'var(--color--orange-200)', color: 'var(--color--orange-950)' };
		case 'node':
			return { backgroundColor: 'var(--color--neutral-200)', color: 'var(--color--neutral-950)' };
		case 'working-memory':
			return { backgroundColor: 'var(--color--mint-200)', color: 'var(--color--mint-950)' };
		case 'suspension':
			return { backgroundColor: 'var(--color--yellow-200)', color: 'var(--color--yellow-950)' };
		default:
			return { backgroundColor: 'var(--color--neutral-200)', color: 'var(--color--neutral-950)' };
	}
});
const rowBorderColor = computed(() => kindRowBorderColor(props.item.kind));
</script>

<template>
	<div :class="[$style.row, selected && $style.selected]" @click="emit('select')">
		<N8nTooltip :content="label" placement="top">
			<span :class="$style.iconWrapper" :style="iconStyle">
				<N8nIcon :icon="icon" size="small" />
			</span>
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

.iconWrapper {
	justify-self: start;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	border-radius: var(--radius--lg);
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
		line-height: 1.2; /* restore normal line height so descenders aren't clipped */
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
