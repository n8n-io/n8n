<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { N8nIcon, N8nMenuItem, N8nText, N8nTooltip } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { INSTANCE_AI_THREADS_VIEW, INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';
import { useInstanceAiStore } from '../instanceAi.store';
import { useExperienceMode } from '../experience/useExperienceMode';
import { threadDisplayState, type ThreadDisplayState } from './threadDisplayState';
import { useThreadLastViewed } from './useThreadLastViewed';

const CHATS_COLLAPSED_KEY = 'n8n:sidebar:instance-ai-chats-collapsed';

type ShownState = Exclude<ThreadDisplayState, 'done'>;

const STATE_LABEL_KEYS = {
	'needs-you': 'instanceAi.threadState.needsYou',
	working: 'instanceAi.threadState.working',
	failed: 'instanceAi.threadState.failed',
	ready: 'instanceAi.threadState.ready',
} as const satisfies Record<ShownState, BaseTextKey>;

type ChatRow = {
	thread: InstanceAiThreadSummary;
	to: RouteLocationRaw;
	item: IMenuItem;
	state?: { kind: ShownState; label: string; rowLabel: string };
};

const props = defineProps<{ collapsed: boolean }>();

const i18n = useI18n();
const route = useRoute();
const instanceAiStore = useInstanceAiStore();
const isInstanceAiNavVisible = useInstanceAiAvailable();
const { isEnabled: showStates } = useExperienceMode();
const { lastViewedAt } = useThreadLastViewed();

const isChatsCollapsed = ref(localStorage.getItem(CHATS_COLLAPSED_KEY) === 'true');
watch(isChatsCollapsed, (val) => localStorage.setItem(CHATS_COLLAPSED_KEY, String(val)));

// The recent chats read the store list; fetch it once the AI Assistant entry is shown.
watch(
	isInstanceAiNavVisible,
	(visible) => {
		if (visible) void instanceAiStore.loadThreads();
	},
	{ immediate: true },
);

// Another tab can start a chat; refresh the list when the user comes back to this one.
const { onDocumentVisible } = useDocumentVisibility();
onDocumentVisible(() => {
	if (isInstanceAiNavVisible.value) void instanceAiStore.loadThreads();
});

const recentThreads = computed(() => {
	const recent = instanceAiStore.threads.slice(0, 5);
	// Keep the open chat in the list when it is older than the five most recent
	// ones, e.g. opened from the history page or by URL.
	const openThreadId = route.name === INSTANCE_AI_THREAD_VIEW ? route.params.threadId : undefined;
	if (typeof openThreadId !== 'string' || recent.some((t) => t.id === openThreadId)) return recent;
	const openThread = instanceAiStore.threads.find((t) => t.id === openThreadId);
	return openThread ? [...recent.slice(0, 4), openThread] : recent;
});

function toRowState(thread: InstanceAiThreadSummary): ChatRow['state'] {
	if (!showStates.value) return undefined;
	const kind = threadDisplayState(thread, lastViewedAt(thread.id));
	if (kind === undefined || kind === 'done') return undefined;
	const label = i18n.baseText(STATE_LABEL_KEYS[kind]);
	const rowLabel = i18n.baseText('instanceAi.threadState.rowLabel', {
		interpolate: { title: thread.title, state: label },
	});
	return { kind, label, rowLabel };
}

function toRow(thread: InstanceAiThreadSummary): ChatRow {
	const to = { name: INSTANCE_AI_THREAD_VIEW, params: { threadId: thread.id } };
	const item: IMenuItem = {
		id: `instance-ai-thread-${thread.id}`,
		icon: 'message-circle',
		label: thread.title,
		route: { to },
	};
	return { thread, to, item, state: toRowState(thread) };
}

const rows = computed(() => recentThreads.value.map(toRow));
</script>

<template>
	<div
		v-if="isInstanceAiNavVisible && !props.collapsed && rows.length > 0"
		:class="$style.instanceAiSidebar"
		data-test-id="instance-ai-sidebar-chats"
	>
		<div :class="$style.chatsHeader">
			<button
				type="button"
				:class="$style.chatsToggle"
				:aria-expanded="!isChatsCollapsed"
				@click="isChatsCollapsed = !isChatsCollapsed"
			>
				<N8nText size="small" bold color="text-light">
					{{ i18n.baseText('instanceAi.threads.chats') }}
				</N8nText>
				<N8nIcon
					icon="chevron-down"
					size="small"
					:class="[$style.chevron, isChatsCollapsed ? $style.chevronCollapsed : '']"
				/>
			</button>
			<RouterLink :to="{ name: INSTANCE_AI_THREADS_VIEW }" :class="$style.chatsViewAll">
				{{ i18n.baseText('instanceAi.threads.viewAll') }}
			</RouterLink>
		</div>
		<div v-if="!isChatsCollapsed">
			<div
				v-for="row in rows"
				:key="row.thread.id"
				:class="[$style.chatRow, { [$style.withState]: row.state }]"
			>
				<N8nMenuItem :item="row.item" :aria-label="row.state?.rowLabel" scroll-label-on-overflow />
				<!-- The row label already names the state, so screen readers skip this copy of the link. -->
				<span v-if="row.state" :class="$style.stateSlot">
					<N8nTooltip placement="right" :content="row.state.label">
						<RouterLink
							:to="row.to"
							tabindex="-1"
							aria-hidden="true"
							:class="$style.stateLink"
							:data-test-id="`instance-ai-thread-state-${row.thread.id}`"
						>
							<N8nIcon
								v-if="row.state.kind === 'needs-you'"
								icon="circle-alert"
								color="--icon-color--warning"
								size="small"
							/>
							<N8nIcon
								v-else-if="row.state.kind === 'working'"
								icon="loader-circle"
								spin
								size="small"
							/>
							<N8nIcon
								v-else-if="row.state.kind === 'failed'"
								icon="circle-x"
								color="--icon-color--danger"
								size="small"
							/>
							<span v-else :class="$style.readyDot" />
						</RouterLink>
					</N8nTooltip>
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.instanceAiSidebar {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--3xs) var(--spacing--xs);
}

.chatsHeader {
	display: flex;
	align-items: center;
	width: 100%;
	box-sizing: border-box;
	margin-top: var(--spacing--4xs);
	border-radius: var(--spacing--4xs);
	color: inherit;

	&:hover {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);

		.chevron {
			color: var(--color--text--shade-1);
		}
	}
}

.chatsToggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	background: none;
	border: none;
	border-radius: var(--spacing--4xs);
	cursor: pointer;
	color: inherit;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.chatsViewAll {
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	text-decoration: none;

	&:hover,
	&:focus-visible {
		color: var(--text-color--subtle);
		text-decoration: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}

@media (hover: hover) {
	.chatsViewAll {
		opacity: 0;
		pointer-events: none;
	}

	.chatsHeader:hover .chatsViewAll,
	.chatsHeader:has(.chatsToggle:focus-visible) .chatsViewAll,
	.chatsViewAll:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}
}

.chevron {
	color: var(--color--text--tint-1);
	transition: transform 0.15s ease;
	flex-shrink: 0;
}

.chevronCollapsed {
	transform: rotate(-90deg);
}

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
