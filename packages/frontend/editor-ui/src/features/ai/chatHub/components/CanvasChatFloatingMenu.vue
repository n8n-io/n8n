<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nDropdownMenu, type DropdownMenuItemProps } from '@n8n/design-system';
import type { ChatHubSessionDto, ChatSessionId } from '@n8n/api-types';
import { PopOutWindowKey } from '@/app/constants';
import { useChatStore } from '../chat.store';
import { groupConversationsByDate } from '../chat.utils';

const props = defineProps<{
	sessionId: ChatSessionId;
	workflowId: string;
	canPopOut?: boolean;
}>();

const emit = defineEmits<{
	'select-session': [sessionId: ChatSessionId];
	'copy-session-id': [];
	'new-session': [];
	'pop-out': [];
}>();

const i18n = useI18n();
const chatStore = useChatStore();
const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());
const isInPopOut = computed(() => !!popOutWindow.value);
const portalTarget = computed(() => popOutWindow.value?.document.body);

const isLoading = ref(false);
const hasFetchedForWorkflow = ref(false);

const workflowSessions = computed(() => {
	const ids = chatStore.sessions.ids ?? [];
	return ids.reduce<ChatHubSessionDto[]>((acc, id) => {
		const s = chatStore.sessions.byId[id];
		if (s && s.workflowId === props.workflowId && s.type === 'manual') {
			acc.push(s);
		}
		return acc;
	}, []);
});

const sessionChildren = computed<Array<DropdownMenuItemProps<string>>>(() => {
	const grouped = groupConversationsByDate(workflowSessions.value);
	if (grouped.length === 0 && !isLoading.value) {
		return [
			{
				id: '__no-sessions__',
				label: i18n.baseText('chatHub.canvas.session.noSessions'),
				disabled: true,
			},
		];
	}

	const items: Array<DropdownMenuItemProps<string>> = [];
	for (let i = 0; i < grouped.length; i++) {
		const group = grouped[i];
		items.push({
			id: `__group-${i}__`,
			label: group.group,
			disabled: true,
			divided: i > 0,
		});
		for (const session of group.sessions) {
			items.push({
				id: session.id,
				label: session.id,
				checked: session.id === props.sessionId,
			});
		}
	}
	return items;
});

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => {
	const items: Array<DropdownMenuItemProps<string>> = [
		{
			id: 'sessions',
			label: i18n.baseText('chatHub.canvas.menu.sessions'),
			icon: { type: 'icon', value: 'history' },
			children: sessionChildren.value,
			loading: isLoading.value,
		},
		{
			id: 'copy-session-id',
			label: i18n.baseText('chatHub.canvas.menu.copySessionId'),
			icon: { type: 'icon', value: 'copy' },
			divided: true,
		},
		{
			id: 'new-session',
			label: i18n.baseText('chatHub.canvas.menu.newSession'),
			icon: { type: 'icon', value: 'undo-2' },
		},
	];

	if (props.canPopOut) {
		items.push({
			id: 'pop-out',
			label: i18n.baseText('chatHub.canvas.menu.popOut'),
			icon: { type: 'icon', value: 'external-link' },
		});
	}

	return items;
});

async function handleSubMenuToggle(itemId: string, open: boolean) {
	if (itemId === 'sessions' && open && !hasFetchedForWorkflow.value) {
		hasFetchedForWorkflow.value = true;
		isLoading.value = true;
		try {
			await chatStore.fetchSessions(true, { type: 'manual' });
		} finally {
			isLoading.value = false;
		}
	}
}

function handleSelect(value: string) {
	switch (value) {
		case 'copy-session-id':
			emit('copy-session-id');
			break;
		case 'new-session':
			emit('new-session');
			break;
		case 'pop-out':
			// Delay to let Reka-UI finish restoring focus to the trigger,
			// then blur it before moving the DOM to the pop-out window.
			// Otherwise the menu would be focused in the new window popout,
			// which feels unnatural.
			setTimeout(() => {
				(document.activeElement as HTMLElement)?.blur?.();
				emit('pop-out');
			});
			break;
		default:
			// Session ID selected from sub-menu
			if (value !== '__no-sessions__') {
				emit('select-session', value);
			}
			break;
	}
}

// Reset fetch state when workflow changes
watch(
	() => props.workflowId,
	() => {
		hasFetchedForWorkflow.value = false;
	},
);
</script>

<template>
	<N8nDropdownMenu
		:items="menuItems"
		:portal-target="portalTarget"
		:modal="!isInPopOut"
		placement="bottom-end"
		data-test-id="canvas-chat-floating-menu"
		@select="handleSelect"
		@submenu:toggle="handleSubMenuToggle"
	/>
</template>
