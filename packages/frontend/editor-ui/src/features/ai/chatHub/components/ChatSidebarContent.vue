<script setup lang="ts">
import MainSidebarUserArea from '@/app/components/MainSidebarUserArea.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { groupConversationsByDate } from '@/features/ai/chatHub/chat.utils';
import ChatSidebarLink from '@/features/ai/chatHub/components/ChatSidebarLink.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { CHAT_VIEW, CHAT_AGENTS_VIEW } from '@/features/ai/chatHub/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { N8nIconButton, N8nScrollArea, N8nText } from '@n8n/design-system';
import Logo from '@n8n/design-system/components/N8nLogo';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChatSessionMenuItem from './ChatSessionMenuItem.vue';

defineProps<{ isMobileDevice: boolean }>();

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const toast = useToast();
const message = useMessage();
const sidebar = useChatHubSidebarState();
const settingsStore = useSettingsStore();

const renamingSessionId = ref<string>();

const currentSessionId = computed(() =>
	typeof route.params.id === 'string' ? route.params.id : undefined,
);
const readyToShowConversations = computed(() => chatStore.agentsReady && chatStore.sessionsReady);

const groupedConversations = computed(() => groupConversationsByDate(chatStore.sessions));

function handleStartRename(sessionId: string) {
	renamingSessionId.value = sessionId;
}

function handleCancelRename() {
	renamingSessionId.value = undefined;
}

async function handleConfirmRename(sessionId: string, newLabel: string) {
	try {
		await chatStore.renameSession(sessionId, newLabel);
		renamingSessionId.value = undefined;
	} catch (error) {
		toast.showError(error, 'Could not update the conversation title.');
	}
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

	try {
		await chatStore.deleteSession(sessionId);
		toast.showMessage({ type: 'success', title: 'Conversation is deleted' });

		if (sessionId === currentSessionId.value) {
			void router.push({ name: CHAT_VIEW });
		}
	} catch (error) {
		toast.showError(error, 'Could not delete the conversation');
	}
}

onMounted(() => {
	void chatStore.fetchSessions();
});
</script>

<template>
	<div :class="[$style.component, { [$style.isMobileDevice]: isMobileDevice }]">
		<div :class="$style.header">
			<RouterLink :to="{ name: VIEWS.HOMEPAGE }">
				<Logo
					:class="$style.logo"
					size="small"
					:collapsed="false"
					:release-channel="settingsStore.settings.releaseChannel"
				/>
			</RouterLink>
			<N8nIconButton
				v-if="sidebar.canBeStatic.value"
				title="Toggle menu"
				icon="panel-left"
				type="tertiary"
				text
				size="small"
				icon-size="large"
				@click="sidebar.toggleStatic()"
			/>
		</div>
		<div :class="$style.items">
			<ChatSidebarLink
				:to="{
					name: CHAT_VIEW,
					force: true, // to focus input again when the user is already in CHAT_VIEW
				}"
				label="New Chat"
				icon="square-pen"
				:active="route.name === CHAT_VIEW"
				@click="sidebar.toggleOpen(false)"
			/>
			<ChatSidebarLink
				:to="{ name: CHAT_AGENTS_VIEW }"
				label="Custom Agents"
				icon="robot"
				:active="route.name === CHAT_AGENTS_VIEW"
				@click="sidebar.toggleOpen(false)"
			/>
		</div>
		<N8nScrollArea as-child type="scroll">
			<div v-if="readyToShowConversations" :class="$style.items">
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
	padding-block: var(--spacing--4xs);

	&.isMobileDevice {
		padding-block: 0;
	}
}

.header {
	height: 56px;
	flex-grow: 0;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-inline: var(--spacing--xs);
	gap: var(--spacing--2xs);
}

.logo {
	/* Adjust vertical alignment */
	margin-top: -4px;
}

.items {
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing--xs) var(--spacing--sm) var(--spacing--xs);
	gap: var(--spacing--xs);

	.isMobileDevice & {
		gap: var(--spacing--sm);
	}
}

.group {
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.groupHeader {
	padding: 0 var(--spacing--4xs) var(--spacing--3xs) var(--spacing--4xs);
}

.loading,
.empty {
	padding: var(--spacing--xs);
	text-align: center;
}
</style>
