<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import type { ChatHubSessionDto, ChatSessionId } from '@n8n/api-types';
import { PopOutWindowKey } from '@n8n/composables/injectionKeys';
import { useChatStore } from '../chat.store';
import { groupConversationsByDate } from '../chat.utils';

const props = defineProps<{
	sessionId: ChatSessionId;
	sessionTitle: string;
	workflowId: string;
}>();

const emit = defineEmits<{
	'select-session': [sessionId: ChatSessionId];
}>();

const i18n = useI18n();
const chatStore = useChatStore();
const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());
const isInPopOut = computed(() => !!popOutWindow.value);
const portalTarget = computed(() => popOutWindow.value?.document.body);

const isOpen = ref(false);
const isLoading = ref(false);
const hasFetchedForWorkflow = ref(false);

const workflowSessions = computed(() => {
	const ids = chatStore.sessions.ids ?? [];
	return ids.reduce<ChatHubSessionDto[]>((acc, id) => {
		const s = chatStore.sessions.byId[id];
		if (s?.workflowId === props.workflowId && s.type === 'manual') {
			acc.push(s);
		}
		return acc;
	}, []);
});

const groupedSessions = computed(() => groupConversationsByDate(workflowSessions.value));

const menuItems = computed<Array<DropdownMenuItemProps<ChatSessionId>>>(() => {
	const items: Array<DropdownMenuItemProps<ChatSessionId>> = [];
	groupedSessions.value.forEach((group) => {
		items.push({
			id: group.group,
			label: group.group,
			header: true,
		});
		for (const session of group.sessions) {
			items.push({
				id: session.id,
				label: formatSessionLabel(session),
				checked: session.id === props.sessionId,
			});
		}
	});
	return items;
});

async function handleOpenChange(open: boolean) {
	isOpen.value = open;
	if (open && !hasFetchedForWorkflow.value) {
		isLoading.value = true;
		try {
			await chatStore.fetchSessions(true, { type: 'manual' });
			hasFetchedForWorkflow.value = true;
		} finally {
			isLoading.value = false;
		}
	}
}

function handleSelect(sessionId: ChatSessionId) {
	emit('select-session', sessionId);
}

function formatSessionLabel(session: ChatHubSessionDto): string {
	return session.id;
}

// Reset fetch state when workflow changes so we re-fetch on next open
watch(
	() => props.workflowId,
	() => {
		isOpen.value = false;
		hasFetchedForWorkflow.value = false;
	},
);
</script>

<template>
	<N8nDropdownMenu
		:model-value="isOpen"
		:items="menuItems"
		:loading="isLoading"
		:empty-text="i18n.baseText('chatHub.canvas.session.noSessions')"
		:modal="!isInPopOut"
		:portal-target="portalTarget"
		placement="bottom-start"
		width="20rem"
		max-height="22.5rem"
		data-test-id="canvas-chat-session-dropdown"
		@update:model-value="handleOpenChange"
		@select="handleSelect"
	>
		<template #trigger>
			<N8nButton
				variant="ghost"
				size="xsmall"
				:title="
					i18n.baseText('chatHub.canvas.session.tooltip.sessionId', {
						interpolate: { sessionId: props.sessionId },
					})
				"
			>
				{{ sessionTitle }}
				<N8nIcon icon="chevron-down" size="xsmall" />
			</N8nButton>
		</template>
	</N8nDropdownMenu>
</template>
