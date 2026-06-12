<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ChatMessages from './ChatMessages.vue';
import ComposerField from './ComposerField.vue';

import { hasUnanswerablePromptForThread } from '../permissions/permission-prompt-store';

// Inline chat for one thread, rendered inside the home tab panel (the slide-up
// overlay flow lives in ChatPanel.vue). Driven entirely by the `threadId` prop —
// no overlay state, no view-title/back-button coupling.
const props = defineProps<{ threadId: string }>();

const i18n = useI18n();

const text = ref('');
const messagesRef = ref<InstanceType<typeof ChatMessages> | null>(null);

// A pending confirmation suspends the run server-side (posting would 409); refuse
// input and say why via the placeholder — unless the chat can answer it as text,
// in which case ChatMessages routes the reply to the confirm endpoint.
const suspended = computed(() => hasUnanswerablePromptForThread(props.threadId));

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
</script>

<template>
	<div :class="$style.chat">
		<!-- Keyed by thread: starting a new chat remounts the transcript (fresh load +
		     listener lifecycle). -->
		<ChatMessages :key="threadId" ref="messagesRef" :thread-id="threadId" />

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
.chat {
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
