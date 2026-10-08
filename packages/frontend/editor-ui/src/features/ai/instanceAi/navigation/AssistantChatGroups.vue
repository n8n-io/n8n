<script lang="ts" setup>
import { computed, useId, useTemplateRef, watch } from 'vue';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import AssistantChatRow from './AssistantChatRow.vue';
import { useAssistantSidebarStore } from './assistantSidebar.store';
import {
	groupThreads,
	stillExpandable,
	type ThreadGroup,
	type ThreadGroupEntry,
} from './groupThreads';
import { threadDisplayState } from './threadDisplayState';
import { CHAT_GROUP_ATTRIBUTE, useKeepGroupFocus } from './useKeepGroupFocus';
import { useThreadLastViewed } from './useThreadLastViewed';

/** The number of chats that a group shows until the user asks for all of them. */
const PER_GROUP = 5;

const GROUP_LABEL_KEYS = {
	'needs-you': 'instanceAi.chatGroups.needsYou',
	working: 'instanceAi.chatGroups.working',
	ready: 'instanceAi.chatGroups.ready',
	done: 'instanceAi.chatGroups.done',
} as const satisfies Record<ThreadGroup, BaseTextKey>;

const props = defineProps<{
	threads: readonly InstanceAiThreadSummary[];
	openThreadId?: string;
}>();

const i18n = useI18n();
const idPrefix = useId();
const { lastViewedAt } = useThreadLastViewed();

// The live list moves a chat to another group when its state changes.
useKeepGroupFocus(useTemplateRef<HTMLElement>('root'));

// "Show all" expands the group here: the history page does not show what each chat needs.
// The store keeps the expanded groups while the user moves between pages.
const sidebarStore = useAssistantSidebarStore();

const groups = computed(() =>
	groupThreads(props.threads, {
		lastViewedAt,
		openThreadId: props.openThreadId,
		perGroup: PER_GROUP,
		expanded: sidebarStore.expandedGroups,
	}),
);

watch(
	groups,
	(entries) => {
		const kept = stillExpandable(sidebarStore.expandedGroups, entries, PER_GROUP);
		if (kept.size < sidebarStore.expandedGroups.size) sidebarStore.expandedGroups = kept;
	},
	{ immediate: true },
);

const headingId = (group: ThreadGroup) => `${idPrefix}-heading-${group}`;
const listId = (group: ThreadGroup) => `${idPrefix}-list-${group}`;
const isExpanded = (group: ThreadGroup) => sidebarStore.expandedGroups.has(group);

function toggle(group: ThreadGroup) {
	const next = new Set(sidebarStore.expandedGroups);
	if (!next.delete(group)) next.add(group);
	sidebarStore.expandedGroups = next;
}

function toggleLabel(entry: ThreadGroupEntry) {
	return isExpanded(entry.group)
		? i18n.baseText('instanceAi.chatGroups.showFewer')
		: i18n.baseText('instanceAi.chatGroups.showAll', {
				interpolate: { count: String(entry.total) },
			});
}
</script>

<template>
	<div ref="root" :class="$style.groups">
		<div
			v-for="entry in groups"
			:key="entry.group"
			:[CHAT_GROUP_ATTRIBUTE]="entry.group"
			:data-test-id="`assistant-chat-group-${entry.group}`"
		>
			<!-- Level 3: the "Chats" section title above is level 2. -->
			<N8nText
				:id="headingId(entry.group)"
				tag="div"
				role="heading"
				:aria-level="3"
				size="small"
				bold
				color="text-base"
				:class="$style.heading"
			>
				{{ i18n.baseText(GROUP_LABEL_KEYS[entry.group]) }}
			</N8nText>
			<ul
				:id="listId(entry.group)"
				role="list"
				:aria-labelledby="headingId(entry.group)"
				:class="$style.list"
			>
				<li v-for="thread in entry.threads" :key="thread.id">
					<AssistantChatRow
						:thread="thread"
						:state="threadDisplayState(thread, lastViewedAt(thread.id))"
					/>
				</li>
			</ul>
			<button
				v-if="entry.total > PER_GROUP"
				type="button"
				:class="$style.showAll"
				:aria-expanded="isExpanded(entry.group)"
				:aria-controls="listId(entry.group)"
				:aria-describedby="headingId(entry.group)"
				data-test-id="assistant-chat-group-show-all"
				@click="toggle(entry.group)"
			>
				{{ toggleLabel(entry) }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

// Group titles start where the row labels start, like "Show all", so that they read as part of
// the section and not as a peer of the section title.
.heading {
	display: block;
	margin-inline-start: var(--spacing--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
}

.list {
	margin: 0;
	padding: 0;
	list-style: none;
}

// Starts where the row labels start: after the row padding and its 24px icon.
.showAll {
	margin-inline-start: var(--spacing--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: none;
	border: none;
	border-radius: var(--radius--3xs);
	cursor: pointer;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	// Regular weight, so that the action does not look like the medium group title below it.
	font-weight: var(--font-weight--regular);

	&:hover {
		color: var(--text-color);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}
</style>
