<script lang="ts" setup>
import { computed, useId, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { INSTANCE_AI_THREADS_VIEW, INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';
import { useInstanceAiStore } from '../instanceAi.store';
import { useExperienceMode } from '../experience/useExperienceMode';
import AssistantChatGroups from './AssistantChatGroups.vue';
import AssistantChatRow from './AssistantChatRow.vue';
import AssistantSectionHeader from './AssistantSectionHeader.vue';
import { threadDisplayState } from './threadDisplayState';
import { FOCUS_ROW_ATTRIBUTE, useKeepRowFocus } from './useKeepListFocus';
import { useLiveThreadList } from './useLiveThreadList';
import { useSidebarThreads } from './useSidebarThreads';
import { useThreadLastViewed } from './useThreadLastViewed';

const CHATS_COLLAPSED_KEY = 'n8n:sidebar:instance-ai-chats-collapsed';

const props = defineProps<{ collapsed: boolean }>();

const i18n = useI18n();
const route = useRoute();
const titleId = useId();
const instanceAiStore = useInstanceAiStore();
const isInstanceAiNavVisible = useInstanceAiAvailable();
const { isEnabled: showStates, mode } = useExperienceMode();
const { lastViewedAt } = useThreadLastViewed();

const isChatsCollapsed = useLocalStorage(CHATS_COLLAPSED_KEY, false, { writeDefaults: false });

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

// The chat states change while the user works elsewhere.
useLiveThreadList(() => showStates.value && isInstanceAiNavVisible.value);

const showGroups = computed(() => showStates.value && mode.value === 'power');

// A reload can push the focused chat out of the five that the flat list shows.
// The groups keep their own focus.
useKeepRowFocus(useTemplateRef<HTMLElement>('root'));

const openThreadId = computed(() => {
	const threadId = route.name === INSTANCE_AI_THREAD_VIEW ? route.params.threadId : undefined;
	return typeof threadId === 'string' ? threadId : undefined;
});

const threads = useSidebarThreads(openThreadId);

const recentThreads = computed(() => {
	const recent = threads.value.slice(0, 5);
	// Keep the open chat in the list when it is older than the five most recent
	// ones, e.g. opened from the history page or by URL.
	const openId = openThreadId.value;
	if (openId === undefined || recent.some((t) => t.id === openId)) return recent;
	const openThread = threads.value.find((t) => t.id === openId);
	return openThread ? [...recent.slice(0, 4), openThread] : recent;
});

const rows = computed(() =>
	recentThreads.value.map((thread) => ({
		thread,
		state: showStates.value ? threadDisplayState(thread, lastViewedAt(thread.id)) : undefined,
	})),
);
</script>

<template>
	<div
		v-if="isInstanceAiNavVisible && !props.collapsed && rows.length > 0"
		ref="root"
		:class="$style.instanceAiSidebar"
		data-test-id="instance-ai-sidebar-chats"
	>
		<AssistantSectionHeader
			v-model:collapsed="isChatsCollapsed"
			:title="i18n.baseText('instanceAi.threads.chats')"
			:title-id="titleId"
			:link="{
				to: { name: INSTANCE_AI_THREADS_VIEW },
				label: i18n.baseText('instanceAi.threads.viewAll'),
			}"
		/>
		<template v-if="!isChatsCollapsed">
			<AssistantChatGroups v-if="showGroups" :threads="threads" :open-thread-id="openThreadId" />
			<div v-else>
				<AssistantChatRow
					v-for="row in rows"
					:key="row.thread.id"
					:[FOCUS_ROW_ATTRIBUTE]="row.thread.id"
					:thread="row.thread"
					:state="row.state"
				/>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.instanceAiSidebar {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--3xs) var(--spacing--xs);
}
</style>
