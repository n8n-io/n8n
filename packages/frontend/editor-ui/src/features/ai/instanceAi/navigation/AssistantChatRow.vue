<script lang="ts" setup>
import { computed } from 'vue';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { N8nIcon, N8nMenuItem, N8nTooltip } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { sharedRowLabel } from '../sharing/sharingView';
import { useSharingText } from '../sharing/useSharingText';
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
const usersStore = useUsersStore();
const sharingText = useSharingText();

const to = computed(() => ({
	name: INSTANCE_AI_THREAD_VIEW,
	params: { threadId: props.thread.id },
}));

/** "Shared by {owner}" for a teammate, "Shared with {project}" for the owner. */
const sharedLabel = computed(() => {
	const label = sharedRowLabel(props.thread, usersStore.currentUserId ?? undefined);
	return label ? sharingText.sharedRowLabel(label) : undefined;
});

const item = computed<IMenuItem>(() => ({
	id: `instance-ai-thread-${props.thread.id}`,
	icon: sharedLabel.value ? 'users' : 'message-circle',
	label: props.thread.title,
	route: { to: to.value },
}));

/** The row title, with the shared label for screen readers. */
const titleLabel = computed(() =>
	sharedLabel.value
		? i18n.baseText('instanceAi.sharing.rowLabel', {
				interpolate: { title: props.thread.title, shared: sharedLabel.value },
			})
		: props.thread.title,
);

const shownState = computed(() => {
	const kind = props.state;
	if (kind === undefined || kind === 'done') return undefined;
	const label = i18n.baseText(STATE_LABEL_KEYS[kind]);
	const rowLabel = i18n.baseText('instanceAi.threadState.rowLabel', {
		interpolate: { title: titleLabel.value, state: label },
	});
	return { kind, label, rowLabel };
});

const rowLabel = computed(
	() => shownState.value?.rowLabel ?? (sharedLabel.value ? titleLabel.value : undefined),
);
</script>

<template>
	<div :class="[$style.chatRow, { [$style.withState]: shownState, [$style.shared]: sharedLabel }]">
		<N8nMenuItem :item="item" :aria-label="rowLabel" scroll-label-on-overflow />
		<!-- Shows the shared label on the row icon. Screen readers get it from the row label. -->
		<span v-if="sharedLabel" :class="$style.sharedSlot">
			<N8nTooltip placement="right" as-child>
				<template #content>{{ sharedLabel }}</template>
				<RouterLink
					:to="to"
					tabindex="-1"
					aria-hidden="true"
					:class="$style.sharedLink"
					:data-test-id="`instance-ai-thread-shared-${props.thread.id}`"
				/>
			</N8nTooltip>
		</span>
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
}

.withState,
.shared {
	&:hover a[role='menuitem'] {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

// A hover target over the row icon (the menu item's padding and icon box). It shows no
// content of its own: the icon below it stays visible.
.sharedSlot {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
	align-items: center;
	height: var(--spacing--xl);
	padding-inline-start: var(--spacing--4xs);
}

.sharedLink {
	display: block;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
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
