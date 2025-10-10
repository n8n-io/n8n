<script setup lang="ts">
import { CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY, VIEWS } from '@/constants';
import { useChatStore } from '@/features/chatHub/chat.store';
import { groupConversationsByDate } from '@/features/chatHub/chat.utils';
import { CHAT_CONVERSATION_VIEW, CHAT_VIEW } from '@/features/chatHub/constants';
import { useUIStore } from '@/stores/ui.store';
import { N8nIcon, N8nIconButton, N8nMenuItem, N8nText } from '@n8n/design-system';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const uiStore = useUIStore();

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

onMounted(async () => {
	await chatStore.fetchSessions();
});
</script>

<template>
	<div>
		<div :class="$style.header">
			<div :class="$style.returnButton" @click="onReturn">
				<i>
					<N8nIcon icon="arrow-left" />
				</i>
				<N8nText bold>Chat</N8nText>
			</div>
			<N8nIconButton title="New chat" icon="square-pen" type="tertiary" text @click="onNewChat" />
		</div>
		<div :class="['side-menu', $style.container]">
			<div :class="$style.items">
				<div v-for="group in groupedConversations" :key="group.group" :class="$style.group">
					<N8nText :class="$style.groupHeader" size="xsmall" bold color="text-light">
						{{ group.group }}
					</N8nText>
					<N8nMenuItem
						v-for="session in group.sessions"
						:key="session.id"
						:active="currentSessionId === session.id"
						:item="{
							id: session.id,
							icon: 'message-circle',
							label: session.label,
							route: { to: { name: CHAT_CONVERSATION_VIEW, params: { id: session.id } } },
						}"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-xs);
	gap: var(--spacing-2xs);
}

.returnButton {
	cursor: pointer;
	display: flex;
	gap: var(--spacing-3xs);
	align-items: center;
	flex: 1;
	&:hover {
		color: var(--color--primary);
	}
}

.items {
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing-3xs);
	gap: var(--spacing-xs);
}

.group {
	display: flex;
	flex-direction: column;
}

.groupHeader {
	padding: 0 var(--spacing-3xs) var(--spacing-3xs) var(--spacing-3xs);
}

.loading,
.empty {
	padding: var(--spacing-xs);
	text-align: center;
}
</style>
