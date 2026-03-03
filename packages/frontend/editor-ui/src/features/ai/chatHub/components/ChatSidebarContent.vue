<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { groupConversationsByDate } from '@/features/ai/chatHub/chat.utils';
import {
	CHAT_VIEW,
	CHAT_WORKFLOW_AGENTS_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
} from '@/features/ai/chatHub/constants';
import { type IMenuItem, N8nMenuItem, N8nScrollArea, N8nText } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChatSessionMenuItem from './ChatSessionMenuItem.vue';
import SkeletonMenuItem from './SkeletonMenuItem.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { type ChatHubSessionDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';

defineProps<{ isCollapsed: boolean }>();

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const toast = useToast();
const message = useMessage();
const credentialsStore = useCredentialsStore();
const telemetry = useTelemetry();
const readyToShowSessions = computed(
	() => chatStore.sessionsReady && credentialsStore.allCredentialTypes.length > 0,
);
const i18n = useI18n();

const renamingSessionId = ref<string>();

const currentSessionId = computed(() =>
	typeof route.params.id === 'string' ? route.params.id : undefined,
);

const groupedConversations = computed(() =>
	groupConversationsByDate(
		(chatStore.sessions.ids ?? []).reduce<ChatHubSessionDto[]>((acc, id) => {
			const session = chatStore.sessions.byId[id];

			if (session) {
				acc.push(session);
			}

			return acc;
		}, []),
	),
);

const newChat = computed<IMenuItem>(() => ({
	id: 'new-chat',
	label: i18n.baseText('chatHub.sidebar.link.newChat'),
	icon: 'plus',
	route: {
		to: {
			name: CHAT_VIEW,
			force: true, // to focus input again when the user is already in CHAT_VIEW
		},
	},
}));

const personalAgents = computed<IMenuItem>(() => ({
	id: 'personal-agents',
	label: i18n.baseText('chatHub.sidebar.link.personalAgents'),
	icon: 'message-square',
	route: {
		to: {
			name: CHAT_PERSONAL_AGENTS_VIEW,
		},
	},
}));

const workflowAgents = computed<IMenuItem>(() => ({
	id: 'workflow-agents',
	label: i18n.baseText('chatHub.sidebar.link.workflowAgents'),
	icon: 'robot',
	route: {
		to: {
			name: CHAT_WORKFLOW_AGENTS_VIEW,
		},
	},
}));

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
		toast.showError(error, i18n.baseText('chatHub.session.updateTitle.error'));
	}
}

async function handleDeleteSession(sessionId: string) {
	const confirmed = await message.confirm(
		i18n.baseText('chatHub.session.delete.confirm.message'),
		i18n.baseText('chatHub.session.delete.confirm.title'),
		{
			confirmButtonText: i18n.baseText('chatHub.session.delete.confirm.button'),
			cancelButtonText: i18n.baseText('chatHub.session.delete.cancel.button'),
		},
	);

	if (confirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		await chatStore.deleteSession(sessionId);
		toast.showMessage({ type: 'success', title: i18n.baseText('chatHub.session.delete.success') });

		if (sessionId === currentSessionId.value) {
			void router.push({ name: CHAT_VIEW });
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('chatHub.session.delete.error'));
	}
}

function handleNewChatClick() {
	telemetry.track('User clicked new chat button', {});
}

onMounted(() => {
	if (!chatStore.sessionsReady) {
		void chatStore.fetchSessions(true, { minLoadingTime: 250 });
	}
});
</script>

<template>
	<div :class="$style.component">
		<div
			:class="{
				[$style.links]: true,
				[$style.collapsed]: isCollapsed,
			}"
		>
			<KeyboardShortcutTooltip
				placement="right"
				:label="i18n.baseText('chatHub.sidebar.link.newChat')"
				:show-after="500"
				:shortcut="{ keys: ['o'], metaKey: true, shiftKey: true }"
			>
				<N8nMenuItem
					:item="newChat"
					:compact="isCollapsed"
					:active="route.name === CHAT_VIEW"
					@click="handleNewChatClick"
				/>
			</KeyboardShortcutTooltip>
			<N8nMenuItem
				:item="personalAgents"
				:compact="isCollapsed"
				:active="route.name === CHAT_PERSONAL_AGENTS_VIEW"
			/>
			<N8nMenuItem
				:item="workflowAgents"
				:compact="isCollapsed"
				:active="route.name === CHAT_WORKFLOW_AGENTS_VIEW"
			/>
		</div>
		<N8nScrollArea as-child type="scroll">
			<div
				:class="[$style.historySections, { [$style.collapsed]: isCollapsed }]"
				data-test-id="chat-conversation-list"
			>
				<div v-if="!readyToShowSessions" :class="$style.group">
					<SkeletonMenuItem v-for="i in 10" :key="`loading-${i}`" />
				</div>
				<div
					v-for="(group, index) in groupedConversations"
					v-else
					:key="group.group"
					:class="$style.group"
				>
					<N8nText
						v-if="!isCollapsed"
						:class="$style.groupHeader"
						size="small"
						bold
						color="text-light"
					>
						{{ group.group }}
					</N8nText>
					<ChatSessionMenuItem
						v-for="session in group.sessions"
						:key="session.id"
						:session="session"
						:compact="isCollapsed"
						:active="currentSessionId === session.id"
						:is-renaming="renamingSessionId === session.id"
						@start-rename="handleStartRename"
						@cancel-rename="handleCancelRename"
						@confirm-rename="handleConfirmRename"
						@delete="handleDeleteSession"
					/>

					<N8nMenuItem
						v-if="
							index === groupedConversations.length - 1 &&
							chatStore.sessions.hasMore &&
							!chatStore.sessionsLoading
						"
						:item="{
							id: 'load-more-sessions',
							label: i18n.baseText('chatHub.sidebar.loadMoreSessions'),
							icon: 'circle-ellipsis',
						}"
						:compact="isCollapsed"
						@click="() => chatStore.fetchMoreSessions({ minLoadingTime: 250 })"
					/>
					<template v-if="index === groupedConversations.length - 1 && chatStore.sessionsLoading">
						<SkeletonMenuItem v-for="i in 10" :key="i" />
					</template>
				</div>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
.logoContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.component {
	display: flex;
	flex-direction: column;
	align-items: stretch;
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

.links {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) var(--spacing--3xs);

	&.collapsed {
		border-bottom: var(--border);
	}
}

.historySections {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) var(--spacing--3xs) var(--spacing--2xs);
	gap: var(--spacing--sm);

	&.collapsed {
		gap: 0;
	}
}

.group {
	display: flex;
	flex-direction: column;
	gap: 2px;
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
