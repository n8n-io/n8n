<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from '@n8n/i18n';

import { N8nHeading, N8nIcon } from '@n8n/design-system';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';

import { useChatStore } from './chat.store';
import { useUsersStore } from '@/stores/users.store';
import type { ChatMessage } from './chat.types';

const i18n = useI18n();
const chatStore = useChatStore();
const userStore = useUsersStore();

type Suggestion = {
	title: string;
	subtitle: string;
	icon?: string;
};

const message = ref('');
const threadRef = ref<HTMLDivElement | null>(null);

const suggestions = ref<Suggestion[]>([
	{
		title: 'Brainstorm ideas',
		subtitle: 'for a product launch or campaign',
		icon: '💡',
	},
	{
		title: 'Explain a concept',
		subtitle: "like Docker as if I'm 12",
		icon: '📘',
	},
	{
		title: 'Summarize text',
		subtitle: 'paste content and get a TL;DR',
		icon: '📝',
	},
	{
		title: 'Draft an email',
		subtitle: 'polite follow-up about a bug',
		icon: '✉️',
	},
]);

const hasMessages = computed(() => chatStore.chatMessages.length > 0);

watch(
	() => chatStore.chatMessages.length,
	async () => {
		await nextTick();
		if (threadRef.value) threadRef.value.scrollTop = threadRef.value.scrollHeight;
	},
	{ immediate: true },
);

function onSubmit() {
	if (!message.value.trim() || chatStore.isStreaming) return;
	chatStore.initChat(message.value);
	message.value = '';
}

function onSuggestionClick(s: Suggestion) {
	console.log('Suggestion clicked', s.title);
	message.value = `${s.title}: ${s.subtitle}`;
}

function onAttach() {
	console.log('Attach clicked');
}

function onMic() {
	console.log('Mic clicked');
}

function displayText(msg: ChatMessage) {
	return msg.type === 'message' ? msg.text : msg.content;
}
</script>

<template>
	<PageViewLayout>
		<div :class="$style.content">
			<section :class="$style.section">
				<div :class="$style.header">
					<N8nHeading tag="h2" bold size="xlarge">
						{{
							`Good morning, ${userStore.currentUser?.firstName ?? userStore.currentUser?.fullName ?? 'User'}!`
						}}
					</N8nHeading>
				</div>

				<!-- Suggestions only when thread is empty -->
				<div v-if="!hasMessages" :class="$style.suggestions">
					<button
						v-for="s in suggestions"
						:key="s.title"
						type="button"
						:class="$style.card"
						@click="onSuggestionClick(s)"
					>
						<div :class="$style.cardIcon" aria-hidden="true">{{ s.icon }}</div>
						<div :class="$style.cardText">
							<div :class="$style.cardTitle">{{ s.title }}</div>
							<div :class="$style.cardSubtitle">{{ s.subtitle }}</div>
						</div>
					</button>
				</div>

				<!-- Chat thread -->
				<!-- TODO: N8nScrollArea -->
				<div v-else :class="$style.threadWrap">
					<div ref="threadRef" :class="$style.thread" role="log" aria-live="polite">
						<div
							v-for="m in chatStore.chatMessages"
							:key="m.id"
							:class="[
								$style.message,
								m.role === 'user' ? $style.user : $style.assistant,
								m.type === 'error' && $style.error,
							]"
						>
							<div :class="$style.avatar">
								<N8nIcon :icon="m.role === 'user' ? 'user' : 'sparkles'" width="20" height="20" />
							</div>
							<div :class="$style.bubble">
								<pre :class="$style.text">{{ displayText(m) }}</pre>
							</div>
						</div>

						<!-- Typing indicator while streaming -->
						<div v-if="chatStore.isStreaming" :class="[$style.message, $style.assistant]">
							<div :class="$style.avatar">
								<N8nIcon icon="sparkles" width="20" height="20" />
							</div>
							<div :class="$style.bubble">
								<span :class="$style.typing"><i></i><i></i><i></i></span>
							</div>
						</div>
					</div>
				</div>

				<!-- Prompt -->
				<form :class="$style.prompt" @submit.prevent="onSubmit">
					<div :class="$style.inputWrap">
						<input
							v-model="message"
							:class="$style.input"
							type="text"
							:placeholder="'Message GPT-4'"
							autocomplete="off"
							:disabled="chatStore.isStreaming"
						/>

						<div :class="$style.actions">
							<button
								:class="$style.iconBtn"
								type="button"
								title="Attach"
								:disabled="chatStore.isStreaming"
								@click="onAttach"
							>
								<N8nIcon icon="paperclip" width="20" height="20" />
							</button>
							<button
								:class="$style.iconBtn"
								type="button"
								title="Voice"
								:disabled="chatStore.isStreaming"
								@click="onMic"
							>
								<N8nIcon icon="mic" width="20" height="20" />
							</button>
							<button
								:class="$style.sendBtn"
								type="submit"
								:disabled="chatStore.isStreaming || !message.trim()"
							>
								<span v-if="!chatStore.isStreaming">Send</span>
								<span v-else>…</span>
							</button>
						</div>
					</div>
					<p :class="$style.disclaimer">AI may make mistakes. Check important info.</p>
				</form>
			</section>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
	padding-bottom: var(--spacing-l);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-l);
}

/* Suggestions */
.suggestions {
	display: grid;
	grid-template-columns: repeat(2, minmax(220px, 1fr));
	gap: var(--spacing-m);
	width: min(960px, 90vw);
	margin-top: var(--spacing-m);
}
@media (max-width: 800px) {
	.suggestions {
		grid-template-columns: 1fr;
	}
}
.card {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing-s);
	padding: var(--spacing-m);
	border: 1px solid var(--color-foreground-base);
	background: var(--color-background-light);
	border-radius: var(--border-radius-large);
	text-align: left;
	cursor: pointer;
	transition:
		transform 0.06s ease,
		background 0.06s ease,
		border-color 0.06s ease;
}
.card:hover {
	border-color: var(--color-primary);
	background: rgba(124, 58, 237, 0.04);
}
.cardIcon {
	font-size: 20px;
	line-height: 1;
}
.cardText {
	display: grid;
	gap: 2px;
}
.cardTitle {
	font-weight: 600;
	color: var(--color-text-dark);
}
.cardSubtitle {
	font-size: 0.9rem;
	color: var(--color-text-light);
}

/* Thread */
.threadWrap {
	width: min(960px, 90vw);
}
.thread {
	max-height: 60vh;
	overflow-y: auto;
	padding: var(--spacing-m);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-large);
	background: var(--color-background-light);
}

.message {
	display: grid;
	grid-template-columns: 28px 1fr;
	gap: var(--spacing-s);
	margin-bottom: var(--spacing-m);
}
.avatar {
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--color-background-xlight);
	color: var(--color-text-light);
}
.bubble {
	padding: 12px 14px;
	border-radius: 14px;
	border: 1px solid var(--color-foreground-base);
	background: var(--color-background-xlight);
}

.user .bubble {
	background: rgba(124, 58, 237, 0.08);
	border-color: rgba(124, 58, 237, 0.25);
}
.assistant .bubble {
	background: var(--color-background-xlight);
}
.error .bubble {
	border-color: #ef4444;
	background: rgba(239, 68, 68, 0.06);
}

.text {
	margin: 0;
	font-family: inherit;
	white-space: pre-wrap;
	word-break: break-word;
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
	margin-top: var(--spacing-xl);
}
.inputWrap {
	position: relative;
	display: flex;
	align-items: center;
	width: min(720px, 50vw);
	min-width: 320px;
}
.input {
	flex: 1;
	font: inherit;
	padding: 14px 112px 14px 14px;
	border: 1px solid var(--color-foreground-base);
	background: var(--color-background-light);
	color: var(--color-text-dark);
	border-radius: 16px;
	outline: none;
}
.input:focus {
	border-color: var(--color-primary);
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
	color: var(--color-text-light);
	cursor: pointer;
}
.iconBtn:hover {
	background: rgba(0, 0, 0, 0.04);
	color: var(--color-text-dark);
}
.sendBtn {
	height: 32px;
	padding: 0 10px;
	border-radius: 10px;
	border: none;
	background: var(--color-primary);
	color: #fff;
	font-weight: 600;
	cursor: pointer;
}
.sendBtn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.disclaimer {
	margin-top: var(--spacing-xs);
	font-size: 0.8rem;
	color: var(--color-text-lighter);
	text-align: center;
}

.chat {
	width: 100%;
}
</style>
