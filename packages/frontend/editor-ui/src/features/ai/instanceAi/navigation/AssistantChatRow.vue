<script lang="ts" setup>
import { computed } from 'vue';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { N8nIcon, N8nMenuItem, N8nTooltip } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import type { ThreadDisplayState } from './threadDisplayState';

type ShownState = Exclude<ThreadDisplayState, 'done'>;

const STATE_LABEL_KEYS = {
	'needs-you': 'instanceAi.threadState.needsYou',
	working: 'instanceAi.threadState.working',
	failed: 'instanceAi.threadState.failed',
	ready: 'instanceAi.threadState.ready',
} as const satisfies Record<ShownState, BaseTextKey>;

const props = defineProps<{
	thread: InstanceAiThreadSummary;
	/** A done chat and a chat without a state show no icon. */
	state?: ThreadDisplayState;
}>();

const i18n = useI18n();

const to = computed(() => ({
	name: INSTANCE_AI_THREAD_VIEW,
	params: { threadId: props.thread.id },
}));

const item = computed<IMenuItem>(() => ({
	id: `instance-ai-thread-${props.thread.id}`,
	icon: 'message-circle',
	label: props.thread.title,
	route: { to: to.value },
}));

const shownState = computed(() => {
	const kind = props.state;
	if (kind === undefined || kind === 'done') return undefined;
	const label = i18n.baseText(STATE_LABEL_KEYS[kind]);
	const rowLabel = i18n.baseText('instanceAi.threadState.rowLabel', {
		interpolate: { title: props.thread.title, state: label },
	});
	return { kind, label, rowLabel };
});
</script>

<template>
	<div :class="[$style.chatRow, { [$style.withState]: shownState }]">
		<N8nMenuItem :item="item" :aria-label="shownState?.rowLabel" scroll-label-on-overflow />
		<!-- The row label already names the state, so screen readers skip this copy of the link. -->
		<span v-if="shownState" :class="$style.stateSlot">
			<N8nTooltip placement="right" :content="shownState.label">
				<RouterLink
					:to="to"
					tabindex="-1"
					aria-hidden="true"
					:class="$style.stateLink"
					:data-test-id="`instance-ai-thread-state-${props.thread.id}`"
				>
					<N8nIcon
						v-if="shownState.kind === 'needs-you'"
						icon="circle-alert"
						color="--icon-color--warning"
						size="small"
					/>
					<N8nIcon
						v-else-if="shownState.kind === 'working'"
						icon="loader-circle"
						spin
						size="small"
					/>
					<N8nIcon
						v-else-if="shownState.kind === 'failed'"
						icon="circle-x"
						color="--icon-color--danger"
						size="small"
					/>
					<span v-else :class="$style.readyDot" />
				</RouterLink>
			</N8nTooltip>
		</span>
	</div>
</template>

<style lang="scss" module>
.chatRow {
	position: relative;
}

// The state icon sits over the end of the row, so the label stops before it and the row
// keeps its hover colour while the pointer is on the icon.
.withState {
	a[role='menuitem'] {
		padding-right: var(--spacing--lg);
	}

	&:hover a[role='menuitem'] {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

.stateSlot {
	position: absolute;
	top: 0;
	right: var(--spacing--2xs);
	display: flex;
	align-items: center;
	// The height of an N8nMenuItem row, so that the icon is centred on the row.
	height: var(--spacing--xl);
	// The space around the icon passes clicks to the row link below it.
	pointer-events: none;

	> * {
		pointer-events: auto;
	}
}

.stateLink {
	display: flex;
	align-items: center;
	color: var(--text-color--subtle);
}

.readyDot {
	display: block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background-color: var(--icon-color--info);
}
</style>
