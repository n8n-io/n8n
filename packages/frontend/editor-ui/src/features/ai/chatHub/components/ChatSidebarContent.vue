<script setup lang="ts">
import MainSidebarUserArea from '@/app/components/MainSidebarUserArea.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { groupConversationsByDate } from '@/features/ai/chatHub/chat.utils';
import ChatSidebarLink from '@/features/ai/chatHub/components/ChatSidebarLink.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import {
	CHAT_VIEW,
	CHAT_WORKFLOW_AGENTS_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
} from '@/features/ai/chatHub/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { N8nIconButton, N8nScrollArea, N8nText } from '@n8n/design-system';
import Logo from '@n8n/design-system/components/N8nLogo';
import BetaTag from '@n8n/design-system/components/BetaTag/BetaTag.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useIntersectionObserver } from '@vueuse/core';
import ChatSessionMenuItem from './ChatSessionMenuItem.vue';
import SkeletonMenuItem from './SkeletonMenuItem.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { type ChatHubSessionDto } from '@n8n/api-types';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useI18n } from '@n8n/i18n';

defineProps<{ isMobileDevice: boolean }>();

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const toast = useToast();
const message = useMessage();
const sidebar = useChatHubSidebarState();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const telemetry = useTelemetry();
const readyToShowSessions = computed(
	() => chatStore.sessionsReady && credentialsStore.allCredentialTypes.length > 0,
);
const i18n = useI18n();

const renamingSessionId = ref<string>();
const loadMoreTrigger = ref<HTMLElement | null>(null);

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
	sidebar.toggleOpen(false);
}

useIntersectionObserver(
	loadMoreTrigger,
	([{ isIntersecting }]) => {
		if (isIntersecting) {
			void chatStore.fetchMoreSessions({ minLoadingTime: 250 });
		}
	},
	{ threshold: 0.1 },
);

onMounted(() => {
	if (!chatStore.sessionsReady) {
		void chatStore.fetchSessions(true, { minLoadingTime: 250 });
	}
});
</script>

<template>
	<div :class="[$style.component, { [$style.isMobileDevice]: isMobileDevice }]">
		<div :class="$style.header">
			<RouterLink :to="{ name: VIEWS.HOMEPAGE }">
				<div :class="$style.logoContainer">
					<Logo
						:class="$style.logo"
						size="small"
						:collapsed="false"
						:release-channel="settingsStore.settings.releaseChannel"
					/>
					<BetaTag />
				</div>
			</RouterLink>
			<N8nIconButton
				v-if="sidebar.canBeStatic.value"
				:title="i18n.baseText('chatHub.sidebar.button.toggle')"
				icon="panel-left"
				type="tertiary"
				text
				size="small"
				icon-size="large"
				@click="sidebar.toggleStatic()"
			/>
		</div>
		<div :class="$style.links">
			<ChatSidebarLink
				:to="{
					name: CHAT_VIEW,
					force: true, // to focus input again when the user is already in CHAT_VIEW
				}"
				:label="i18n.baseText('chatHub.sidebar.link.newChat')"
				icon="square-pen"
				:active="route.name === CHAT_VIEW"
				@click="handleNewChatClick"
			/>
			<ChatSidebarLink
				:to="{ name: CHAT_PERSONAL_AGENTS_VIEW }"
				:label="i18n.baseText('chatHub.sidebar.link.personalAgents')"
				icon="message-square"
				:active="route.name === CHAT_PERSONAL_AGENTS_VIEW"
				@click="sidebar.toggleOpen(false)"
			/>
			<ChatSidebarLink
				:to="{ name: CHAT_WORKFLOW_AGENTS_VIEW }"
				:label="i18n.baseText('chatHub.sidebar.link.workflowAgents')"
				icon="robot"
				:active="route.name === CHAT_WORKFLOW_AGENTS_VIEW"
				@click="sidebar.toggleOpen(false)"
			/>
		</div>
		<N8nScrollArea as-child type="scroll">
			<div :class="$style.historySections">
				<div v-if="!readyToShowSessions" :class="$style.group">
					<SkeletonMenuItem v-for="i in 10" :key="`loading-${i}`" />
				</div>
				<div
					v-else
					v-for="(group, index) in groupedConversations"
					:key="group.group"
					:class="$style.group"
				>
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
					<template v-if="index === groupedConversations.length - 1 && chatStore.sessionsLoading">
						<SkeletonMenuItem v-for="i in 10" :key="i" />
					</template>
				</div>

				<div ref="loadMoreTrigger" :class="$style.loadMoreTrigger"></div>
			</div>
		</N8nScrollArea>
		<MainSidebarUserArea :fully-expanded="true" :is-collapsed="false" />
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

.links {
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing--xs) var(--spacing--sm) var(--spacing--xs);
	gap: 1px;
}

.historySections {
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

.loadMoreTrigger {
	height: 1px;
	width: 100%;
}

.loading,
.empty {
	padding: var(--spacing--xs);
	text-align: center;
}
</style>
