<script setup lang="ts">
import MainSidebarUserArea from '@/components/MainSidebarUserArea.vue';
import { CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY, MODAL_CONFIRM, VIEWS } from '@/constants';
import { useChatStore } from '@/features/chatHub/chat.store';
import { groupConversationsByDate } from '@/features/chatHub/chat.utils';
import { CHAT_VIEW } from '@/features/chatHub/constants';
import { useUIStore } from '@/stores/ui.store';
import { N8nIcon, N8nIconButton, N8nScrollArea, N8nText } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChatSessionMenuItem from './ChatSessionMenuItem.vue';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';

defineProps<{ isMobileDevice: boolean }>();

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const uiStore = useUIStore();
const toast = useToast();
const message = useMessage();

const renamingSessionId = ref<string>();

const currentSessionId = computed(() =>
	typeof route.params.id === 'string' ? route.params.id : undefined,
);

const groupedConversations = computed(() => groupConversationsByDate(chatStore.sessions));

function onReturn() {
	uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);

	void router.push({ name: VIEWS.HOMEPAGE });
}

function onNewChat() {
	uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);

	void router.push({
		name: CHAT_VIEW,
		force: true, // to focus input again when the user is already in CHAT_VIEW
	});
}

function handleStartRename(sessionId: string) {
	renamingSessionId.value = sessionId;
}

function handleCancelRename() {
	renamingSessionId.value = undefined;
}

async function handleConfirmRename(sessionId: string, newLabel: string) {
	await chatStore.renameSession(sessionId, newLabel);
	renamingSessionId.value = undefined;
}

async function handleDeleteSession(sessionId: string) {
	const confirmed = await message.confirm(
		'Are you sure you want to delete this conversation?',
		'Delete conversation',
		{
			confirmButtonText: 'Delete',
			cancelButtonText: 'Cancel',
		},
	);

	if (confirmed !== MODAL_CONFIRM) {
		return;
	}

	await chatStore.deleteSession(sessionId);
	toast.showMessage({ type: 'success', title: 'Conversation is deleted' });
}

onMounted(async () => {
	await chatStore.fetchSessions();
});
</script>

<template>
	<div :class="[$style.component, { [$style.isMobileDevice]: isMobileDevice }]">
		<div :class="$style.header">
			<div :class="$style.returnButton" role="button" @click="onReturn">
				<N8nIcon icon="arrow-left" />
				<N8nText bold>Chat</N8nText>
			</div>
			<N8nIconButton
				title="New chat"
				icon="square-pen"
				type="tertiary"
				text
				:size="isMobileDevice ? 'large' : 'medium'"
				@click="onNewChat"
			/>
		</div>
		<N8nScrollArea as-child>
			<div :class="$style.items">
				<div v-for="group in groupedConversations" :key="group.group" :class="$style.group">
					<N8nText :class="$style.groupHeader" size="small" bold color="text-light">
						{{ group.group }}
					</N8nText>
					<ChatSessionMenuItem
						v-for="session in group.sessions"
						:key="session.id"
						:session="session"
						:active="currentSessionId === session.id"
						:is-renaming="renamingSessionId === session.id"
						@start-rename="handleStartRename"
						@cancel-rename="handleCancelRename"
						@confirm-rename="handleConfirmRename"
						@delete="handleDeleteSession"
					/>
				</div>
			</div>
		</N8nScrollArea>
		<MainSidebarUserArea :fully-expanded="true" :is-collapsed="false" />
	</div>
</template>

<style lang="scss" module>
.component {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs);
	gap: var(--spacing--2xs);
}

.returnButton {
	cursor: pointer;
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;
	flex: 1;

	&:hover {
		color: var(--color--primary);
	}
}

.items {
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing--3xs);
	gap: var(--spacing--xs);

	.isMobileDevice & {
		gap: var(--spacing--sm);
	}
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.groupHeader {
	padding: 0 var(--spacing--3xs) var(--spacing--3xs) var(--spacing--3xs);
}

.loading,
.empty {
	padding: var(--spacing--xs);
	text-align: center;
}
</style>
