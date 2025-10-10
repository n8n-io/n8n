<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, useTemplateRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import hljs from 'highlight.js/lib/core';

import { N8nHeading, N8nIcon, N8nText, N8nScrollArea } from '@n8n/design-system';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import ModelSelector from './components/ModelSelector.vue';
import CredentialSelectorModal from './components/CredentialSelectorModal.vue';

import { useChatStore } from './chat.store';
import { useUsersStore } from '@/stores/users.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useUIStore } from '@/stores/ui.store';
import {
	credentialsMapSchema,
	type ChatMessage,
	type CredentialsMap,
	type Suggestion,
} from './chat.types';
import {
	chatHubConversationModelSchema,
	type ChatHubProvider,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
	chatHubProviderSchema,
} from '@n8n/api-types';
import VueMarkdown from 'vue-markdown-render';
import markdownLink from 'markdown-it-link-attributes';
import type MarkdownIt from 'markdown-it';
import { useLocalStorage } from '@vueuse/core';
import {
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL,
	LOCAL_STORAGE_CHAT_HUB_CREDENTIALS,
} from '@/constants';
import { CHAT_CONVERSATION_VIEW, CHAT_VIEW, SUGGESTIONS } from '@/features/chatHub/constants';
import { findOneFromModelsResponse } from '@/features/chatHub/chat.utils';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const route = useRoute();
const chatStore = useChatStore();
const userStore = useUsersStore();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const toast = useToast();

const inputRef = useTemplateRef('inputRef');
const message = ref('');
const sessionId = computed<string>(() =>
	typeof route.params.id === 'string' ? route.params.id : uuidv4(),
);
const isNewSession = computed(() => sessionId.value !== route.params.id);
const messagesRef = ref<HTMLDivElement | null>(null);
const scrollAreaRef = ref<InstanceType<typeof N8nScrollArea>>();
const credentialSelectorProvider = ref<ChatHubProvider | null>(null);
const selectedModel = useLocalStorage<ChatHubConversationModel | null>(
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL,
	null,
	{
		writeDefaults: false,
		shallow: true,
		serializer: {
			read: (value) => {
				try {
					return chatHubConversationModelSchema.parse(JSON.parse(value));
				} catch (error) {
					return null;
				}
			},
			write: (value) => JSON.stringify(value),
		},
	},
);

const selectedCredentials = useLocalStorage<CredentialsMap>(
	LOCAL_STORAGE_CHAT_HUB_CREDENTIALS,
	{},
	{
		writeDefaults: false,
		shallow: true,
		serializer: {
			read: (value) => {
				try {
					return credentialsMapSchema.parse(JSON.parse(value));
				} catch (error) {
					return {};
				}
			},
			write: (value) => JSON.stringify(value),
		},
	},
);

const autoSelectCredentials = computed<CredentialsMap>(() =>
	Object.fromEntries(
		chatHubProviderSchema.options.map((provider) => {
			const lastCreatedCredential =
				credentialsStore
					.getCredentialsByType(PROVIDER_CREDENTIAL_TYPE_MAP[provider])
					.toSorted((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]?.id ?? null;

			return [provider, lastCreatedCredential];
		}),
	),
);

const mergedCredentials = computed(() => ({
	...autoSelectCredentials.value,
	...selectedCredentials.value,
}));

const chatMessages = computed(() => chatStore.messagesBySession[sessionId.value] ?? []);
const hasMessages = computed(() => chatMessages.value.length > 0);
const inputPlaceholder = computed(() => {
	if (!selectedModel.value) {
		return 'Select a model';
	}

	const modelName = selectedModel.value.model;

	return `Message ${modelName}`;
});

const scrollOnNewMessage = ref(true);

const credentialsName = computed(() =>
	selectedModel.value
		? credentialsStore.getCredentialById(
				mergedCredentials.value[selectedModel.value.provider] ?? '',
			)?.name
		: undefined,
);

function getScrollViewport(): HTMLElement | null {
	const root = scrollAreaRef.value?.$el as HTMLElement | undefined;
	return root?.querySelector('[data-reka-scroll-area-viewport]') as HTMLElement | null;
}

function scrollToBottom() {
	const viewport = getScrollViewport();
	if (viewport && messagesRef.value) {
		viewport.scrollTo({
			top: messagesRef.value.scrollHeight,
			behavior: 'smooth',
		});
	}
}

watch(
	chatMessages,
	async (messages) => {
		// Check if the last message is user and scroll to bottom of the chat
		if (scrollOnNewMessage.value && messages.length > 0) {
			// Wait for DOM updates before scrolling
			await nextTick();
			// Check if viewport is available after nextTick
			if (getScrollViewport()) {
				scrollToBottom();
			}
		}
	},
	{ immediate: true, deep: true },
);

// TODO: fix duplicate requests
watch(
	mergedCredentials,
	async (credentials) => {
		const models = await chatStore.fetchChatModels(credentials);
		const selected = selectedModel.value;

		if (selected === null) {
			selectedModel.value = findOneFromModelsResponse(models) ?? null;
		}
	},
	{ immediate: true },
);

watch(
	[sessionId, isNewSession],
	async ([id, isNew]) => {
		if (!isNew && !chatStore.messagesBySession[id]) {
			try {
				await chatStore.fetchMessages(id);
			} catch (error) {
				toast.showError(error, 'Error fetching a conversation');
				await router.push({ name: CHAT_VIEW });
			}
		}

		inputRef.value?.focus();
	},
	{ immediate: true },
);

onMounted(async () => {
	await Promise.all([
		credentialsStore.fetchCredentialTypes(false),
		credentialsStore.fetchAllCredentials(),
	]);
});

function onModelChange(selection: ChatHubConversationModel) {
	selectedModel.value = selection;
}

function onConfigure(provider: ChatHubProvider) {
	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
	const existingCredentials = credentialsStore.getCredentialsByType(credentialType);

	if (existingCredentials.length === 0) {
		uiStore.openNewCredential(credentialType);
		return;
	}

	credentialSelectorProvider.value = provider;
	uiStore.openModal('chatCredentialSelector');
}

function onCredentialSelected(provider: ChatHubProvider, credentialId: string) {
	selectedCredentials.value = { ...selectedCredentials.value, [provider]: credentialId };
}

function onCreateNewCredential(provider: ChatHubProvider) {
	uiStore.openNewCredential(PROVIDER_CREDENTIAL_TYPE_MAP[provider]);
}

function onSubmit() {
	if (!message.value.trim() || chatStore.isResponding || !selectedModel.value) {
		return;
	}

	const credentialsId = mergedCredentials.value[selectedModel.value.provider];

	if (!credentialsId) {
		return;
	}

	chatStore.askAI(sessionId.value, message.value, selectedModel.value, {
		[PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.value.provider]]: {
			id: credentialsId,
			name: '',
		},
	});

	message.value = '';

	if (isNewSession.value) {
		void router.push({ name: CHAT_CONVERSATION_VIEW, params: { id: sessionId.value } });
	}
}

function onSuggestionClick(s: Suggestion) {
	message.value = `${s.title} ${s.subtitle}`;
}

function onAttach() {}

function onMic() {}

function messageText(msg: ChatMessage) {
	return msg.type === 'message' ? msg.text : `**Error:** ${msg.content}`;
}

const markdownOptions = {
	highlight(str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch {}
		}

		return ''; // use external default escaping
	},
};

const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	vueMarkdownItInstance.use(markdownLink, {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	});
};
</script>

<template>
	<PageViewLayout>
		<ModelSelector
			:class="$style.modelSelector"
			:models="chatStore.models ?? null"
			:selected-model="selectedModel"
			:disabled="chatStore.isResponding"
			:credentials-name="credentialsName"
			@change="onModelChange"
			@configure="onConfigure"
		/>
		<CredentialSelectorModal
			v-if="credentialSelectorProvider"
			:key="credentialSelectorProvider"
			:provider="credentialSelectorProvider"
			:initial-value="mergedCredentials[credentialSelectorProvider] ?? null"
			@select="onCredentialSelected"
			@create-new="onCreateNewCredential"
		/>
		<div
			:class="{
				[$style.content]: true,
				[$style.centered]: !hasMessages,
			}"
		>
			<section
				:class="{
					[$style.section]: true,
					[$style.fullHeight]: hasMessages,
				}"
			>
				<div v-if="!hasMessages" :class="$style.header">
					<N8nHeading tag="h2" bold size="xlarge">
						{{
							`Good morning, ${userStore.currentUser?.firstName ?? userStore.currentUser?.fullName ?? 'User'}!`
						}}
					</N8nHeading>
				</div>

				<div v-if="!hasMessages" :class="$style.suggestions">
					<button
						v-for="s in SUGGESTIONS"
						:key="s.title"
						type="button"
						:class="$style.card"
						@click="onSuggestionClick(s)"
					>
						<div :class="$style.cardIcon" aria-hidden="true">
							<N8nText size="xlarge">{{ s.icon }}</N8nText>
						</div>
						<div :class="$style.cardText">
							<N8nText bold color="text-dark">{{ s.title }}</N8nText>
							<N8nText color="text-base">{{ s.subtitle }}</N8nText>
						</div>
					</button>
				</div>

				<!-- Chat thread -->
				<template v-else>
					<div :class="$style.threadContainer">
						<N8nScrollArea
							ref="scrollAreaRef"
							type="hover"
							:enable-vertical-scroll="true"
							:enable-horizontal-scroll="false"
							:class="$style.threadWrap"
						>
							<div ref="messagesRef" :class="$style.thread" role="log" aria-live="polite">
								<div
									v-for="m in chatMessages"
									:key="m.id"
									:class="[
										$style.message,
										m.role === 'user' ? $style.user : $style.assistant,
										m.type === 'error' && $style.error,
									]"
								>
									<div :class="$style.avatar">
										<N8nIcon
											:icon="m.role === 'user' ? 'user' : 'sparkles'"
											width="20"
											height="20"
										/>
									</div>
									<div
										:class="{
											[$style.chatMessage]: true,
											[$style.chatMessageFromUser]: m.role === 'user',
											[$style.chatMessageFromAssistant]: m.role === 'assistant',
										}"
									>
										<VueMarkdown
											:class="$style.chatMessageMarkdown"
											:source="messageText(m)"
											:options="markdownOptions"
											:plugins="[linksNewTabPlugin]"
										/>
									</div>
								</div>

								<!-- Typing indicator while streaming -->
								<div v-if="chatStore.isResponding" :class="[$style.message, $style.assistant]">
									<div :class="$style.avatar">
										<N8nIcon icon="sparkles" width="20" height="20" />
									</div>
									<div :class="$style.bubble">
										<span :class="$style.typing"><i></i><i></i><i></i></span>
									</div>
								</div>
							</div>
						</N8nScrollArea>
					</div>
				</template>

				<!-- Prompt -->
				<form :class="$style.prompt" @submit.prevent="onSubmit">
					<div :class="$style.inputWrap">
						<input
							ref="inputRef"
							v-model="message"
							:class="$style.input"
							type="text"
							:placeholder="inputPlaceholder"
							autocomplete="off"
							autofocus
							:disabled="chatStore.isResponding"
						/>

						<div :class="$style.actions">
							<button
								:class="$style.iconBtn"
								type="button"
								title="Attach"
								:disabled="chatStore.isResponding"
								@click="onAttach"
							>
								<N8nIcon icon="paperclip" width="20" height="20" />
							</button>
							<button
								:class="$style.iconBtn"
								type="button"
								title="Voice"
								:disabled="chatStore.isResponding"
								@click="onMic"
							>
								<N8nIcon icon="mic" width="20" height="20" />
							</button>
							<button
								:class="$style.sendBtn"
								type="submit"
								:disabled="chatStore.isResponding || !message.trim()"
							>
								<span v-if="!chatStore.isResponding">Send</span>
								<span v-else>…</span>
							</button>
						</div>
					</div>
					<N8nText :class="$style.disclaimer" color="text-light" size="small">
						AI may make mistakes. Check important info.
						<br />
						{{ sessionId }}
					</N8nText>
				</form>
			</section>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-bottom: var(--spacing--lg);

	height: 100%;
	min-height: 0;
}

.centered {
	justify-content: center;
}

.section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
}

.fullHeight {
	flex: 1;
	min-height: 0;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

/* Suggestions */
.suggestions {
	display: grid;
	grid-template-columns: repeat(2, minmax(220px, 1fr));
	gap: var(--spacing--md);
	width: min(960px, 90%);
	margin-top: var(--spacing--md);
}
@media (max-width: 800px) {
	.suggestions {
		grid-template-columns: 1fr;
	}
}
.card {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: 1px solid var(--color--foreground);
	background: var(--color--background);
	border-radius: var(--radius--lg);
	text-align: left;
	cursor: pointer;
	transition:
		transform 0.06s ease,
		background 0.06s ease,
		border-color 0.06s ease;
}
.card:hover {
	border-color: var(--color--primary);
	background: rgba(124, 58, 237, 0.04);
}
.cardIcon {
	height: 100%;
	display: flex;
	align-items: center;
}
.cardText {
	display: grid;
	gap: 2px;
}

.threadWrap {
	flex: 1;
	height: 100%;
	min-height: 0;
}

.threadContainer {
	width: min(960px, 90%);
	flex: 1;
	min-height: 0;
	display: flex;
}

.thread {
	padding: var(--spacing--md);
	background: var(--color--background--light-2);
}

.message {
	display: grid;
	grid-template-columns: 28px 1fr;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--md);
}
.avatar {
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--color--background--light-3);
	color: var(--color--text--tint-1);
}

.chatMessage {
	display: block;
	position: relative;
	max-width: fit-content;
	padding: var(--spacing--md);
	border-radius: var(--radius--lg);

	&.chatMessageFromAssistant {
		background-color: var(--color--background);
	}

	&.chatMessageFromUser {
		background-color: var(--color--background--shade-1);
	}

	> .chatMessageMarkdown {
		display: block;
		box-sizing: border-box;
		font-size: inherit;

		> *:first-child {
			margin-top: 0;
		}

		> *:last-child {
			margin-bottom: 0;
		}

		p {
			margin: var(--spacing--xs) 0;
		}

		pre {
			font-family: inherit;
			font-size: inherit;
			margin: 0;
			white-space: pre-wrap;
			box-sizing: border-box;
			padding: var(--chat--spacing);
			background: var(--chat--message--pre--background);
			border-radius: var(--chat--border-radius);
		}
	}
}

/* Typing indicator */
.typing {
	display: inline-flex;
	gap: 6px;
}
.typing i {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.35;
	animation: blink 1.2s infinite;
}
.typing i:nth-child(2) {
	animation-delay: 0.2s;
}
.typing i:nth-child(3) {
	animation-delay: 0.4s;
}

@keyframes blink {
	0%,
	80%,
	100% {
		opacity: 0.35;
		transform: translateY(0);
	}
	40% {
		opacity: 1;
		transform: translateY(-2px);
	}
}

/* Prompt */
.prompt {
	display: grid;
	place-items: center;
	width: 100%;
	margin-top: var(--spacing--md);
}
.inputWrap {
	position: relative;
	display: flex;
	align-items: center;
	width: min(720px, 50vw);
	min-width: 320px;

	& input:disabled {
		cursor: not-allowed;
	}
}
.input {
	flex: 1;
	font: inherit;
	padding: 14px 112px 14px 14px;
	border: 1px solid var(--color--foreground);
	background: var(--color--background--light-2);
	color: var(--color--text--shade-1);
	border-radius: 16px;
	outline: none;
}
.input:focus {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

/* Right-side actions */
.actions {
	position: absolute;
	right: 6px;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	gap: 6px;
}
.iconBtn {
	display: grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: 10px;
	border: none;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
}
.iconBtn:hover {
	background: rgba(0, 0, 0, 0.04);
	color: var(--color--text--shade-1);
}
.sendBtn {
	height: 32px;
	padding: 0 10px;
	border-radius: 10px;
	border: none;
	background: var(--color--primary);
	color: #fff;
	font-weight: 600;
	cursor: pointer;
}
.sendBtn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.disclaimer {
	margin-top: var(--spacing--xs);
	color: var(--color--text--tint-2);
	text-align: center;
}

.modelSelector {
	position: absolute;
	top: var(--spacing-xs);
	left: var(--spacing-xs);
	z-index: 100;
}
</style>
