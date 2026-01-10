<script setup lang="ts">
import Close from 'virtual:icons/mdi/close';
import Refresh from 'virtual:icons/mdi/refresh';
import { computed, nextTick, onMounted } from 'vue';

import GetStarted from '@n8n/chat/components/GetStarted.vue';
import GetStartedFooter from '@n8n/chat/components/GetStartedFooter.vue';
import Input from '@n8n/chat/components/Input.vue';
import Layout from '@n8n/chat/components/Layout.vue';
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';

const { t } = useI18n();
const chatStore = useChat();

const { messages, currentSessionId } = chatStore;
const { options } = useOptions();

const showCloseButton = computed(() => options.mode === 'window' && options.showWindowCloseButton);

async function getStarted() {
	if (!chatStore.startNewSession) {
		return;
	}
	void chatStore.startNewSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

function resetChat() {
	if (chatStore.resetSession) {
		chatStore.resetSession();
	}
}

async function initialize() {
	if (!chatStore.loadPreviousSession) {
		return;
	}
	await chatStore.loadPreviousSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

function closeChat() {
	chatEventBus.emit('close');
}

onMounted(async () => {
	await initialize();
	if (!options.showWelcomeScreen && !currentSessionId.value) {
		await getStarted();
	}
});
</script>

<template>
	<Layout class="chat-wrapper">
		<template #header>
			<div class="chat-heading">
				<h1>
					{{ t('title') }}
				</h1>
				<div class="chat-header-actions">
					<button class="chat-header-button" :title="t('resetConversation')" @click="resetChat">
						<Refresh height="18" width="18" />
					</button>
					<button
						v-if="showCloseButton"
						class="chat-header-button chat-close-button"
						:title="t('closeButtonTooltip')"
						@click="closeChat"
					>
						<Close height="18" width="18" />
					</button>
				</div>
			</div>
			<p v-if="t('subtitle')">{{ t('subtitle') }}</p>
		</template>
		<GetStarted v-if="!currentSessionId && options.showWelcomeScreen" @click:button="getStarted" />
		<MessagesList v-else :messages="messages" />
		<template #footer>
			<Input v-if="currentSessionId" />
			<GetStartedFooter v-else />
		</template>
	</Layout>
</template>

<style lang="scss">
.chat-heading {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.chat-header-actions {
	display: flex;
	align-items: center;
	gap: var(--chat--header--actions--gap, 8px);
}

.chat-header-button {
	display: flex;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--chat--close--button--color, inherit);

	&:hover {
		color: var(--chat--close--button--color-hover, var(--chat--color--primary));
	}
}
</style>
