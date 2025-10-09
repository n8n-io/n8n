<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CHAT_CONVERSATION_VIEW } from '@/features/chatHub/constants';
import { N8nIcon, N8nMenuItem, N8nText, type IMenuItem } from '@n8n/design-system';
import { useChatStore } from '@/features/chatHub/chat.store';
import { VIEWS } from '@/constants';

const router = useRouter();
const chatStore = useChatStore();

onMounted(async () => {
	await chatStore.fetchConversations();
});

const sidebarMenuItems = computed<IMenuItem[]>(() => {
	const menuItems: IMenuItem[] = chatStore.conversations.map((conversation) => ({
		id: conversation.id,
		label: conversation.title,
		position: 'top',
	}));

	return menuItems;
});

const visibleItems = computed(() =>
	sidebarMenuItems.value.filter((item) => item.available !== false),
);

function onConversationClick(conversationId: string) {
	void router.push({
		name: CHAT_CONVERSATION_VIEW,
		params: { id: conversationId },
	});
}

function onReturn() {
	void router.push({ name: VIEWS.HOMEPAGE });
}
</script>

<template>
	<div :class="['side-menu', $style.container]">
		<div :class="$style.returnButton" data-test-id="chat-back" @click="onReturn">
			<i>
				<N8nIcon icon="arrow-left" />
			</i>
			<N8nText bold>Chat</N8nText>
		</div>
		<div :class="$style.items">
			<div v-if="chatStore.loadingConversations" :class="$style.loading">
				<N8nText color="text-light">Loading conversations...</N8nText>
			</div>
			<N8nMenuItem
				v-for="item in visibleItems"
				:key="item.id"
				:item="item"
				@click="onConversationClick(item.id)"
			/>
			<div
				v-if="!chatStore.loadingConversations && visibleItems.length === 0"
				:class="$style.empty"
			>
				<N8nText color="text-light">No conversations yet</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	min-width: $sidebar-expanded-width;
	height: 100%;
	background-color: var(--color-background-xlight);
	border-right: var(--border-base);
	position: relative;
	overflow: auto;
}

.returnButton {
	padding: var(--spacing-xs);
	cursor: pointer;
	display: flex;
	gap: var(--spacing-3xs);
	align-items: center;
	&:hover {
		color: var(--color-primary);
	}
}

.items {
	display: flex;
	flex-direction: column;

	padding: 0 var(--spacing-3xs);
}

.loading,
.empty {
	padding: var(--spacing-xs);
	text-align: center;
}
</style>
