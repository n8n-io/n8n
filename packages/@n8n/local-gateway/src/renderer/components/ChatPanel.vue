<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ChatMessages from './ChatMessages.vue';
import ComposerField from './ComposerField.vue';

import { useViewTitle } from '../app/view-title';
import { chatOverlay, closeChat, setChatTitle } from '../chat/chat-overlay';
import { hasBlockingPromptForThread } from '../permissions/permission-prompt-store';

const i18n = useI18n();

useViewTitle(() => chatOverlay.title ?? i18n.baseText('desktopAssistant.chat.title'), closeChat);

const text = ref('');
const messagesRef = ref<InstanceType<typeof ChatMessages> | null>(null);

// A pending confirmation suspends the run server-side (posting would 409);
// refuse input and say why via the placeholder.
const suspended = computed(
	() => chatOverlay.threadId !== null && hasBlockingPromptForThread(chatOverlay.threadId),
);

const placeholder = computed(() =>
	i18n.baseText(
		suspended.value
			? 'desktopAssistant.permissions.suspendedPlaceholder'
			: 'desktopAssistant.chat.placeholder',
	),
);

async function submit() {
	const value = text.value.trim();
	if (!value || messagesRef.value?.busy || suspended.value) return;
	text.value = '';
	await messagesRef.value?.send(value);
}

function onTitleChanged(title: string, isFallback?: boolean) {
	setChatTitle(title, { fallback: isFallback });
}
</script>

<template>
	<div v-if="chatOverlay.threadId" :class="$style.panel">
		<!-- Keyed by thread: switching threads remounts the transcript (fresh load +
		     listener lifecycle) without touching the panel or its slide-up transition. -->
		<ChatMessages
			:key="chatOverlay.threadId"
			ref="messagesRef"
			:thread-id="chatOverlay.threadId"
			:last-event-id="chatOverlay.lastEventId"
			@title-changed="onTitleChanged"
		/>

		<div :class="$style.composer">
			<!-- Stays enabled while the agent works (disabling would steal focus); submit() simply refuses while busy. -->
			<ComposerField
				v-model="text"
				:busy="messagesRef?.busy"
				:placeholder="placeholder"
				:input-aria-label="i18n.baseText('desktopAssistant.chat.inputAriaLabel')"
				:send-aria-label="i18n.baseText('desktopAssistant.chat.send')"
				@submit="submit"
			/>
		</div>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	background: var(--da-surface);
}

.composer {
	padding: var(--spacing--xs);
	background: var(--da-bg);
	border-top: 1px solid var(--da-border);
}
</style>
