<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import ChatMessages from '../components/ChatMessages.vue';
import ComposerField from '../components/ComposerField.vue';

// TODO(desktop-assistant): create and persist a real thread (personal project +
// POST /instance-ai/threads) instead of this fixed development thread.
const CHAT_THREAD_ID = '4d49ba31-32c9-4ccb-8606-626e9087b417';

const i18n = useI18n();

const text = ref('');
const messagesRef = ref<InstanceType<typeof ChatMessages> | null>(null);

async function submit() {
	const value = text.value.trim();
	if (!value || messagesRef.value?.busy) return;
	text.value = '';
	await messagesRef.value?.send(value);
}
</script>

<template>
	<div :class="$style.view">
		<ChatMessages ref="messagesRef" :thread-id="CHAT_THREAD_ID" />

		<div :class="$style.composer">
			<!-- Stays enabled while the agent works (disabling would steal focus); submit() simply refuses while busy. -->
			<ComposerField
				v-model="text"
				:busy="messagesRef?.busy"
				:placeholder="i18n.baseText('desktopAssistant.chat.placeholder')"
				:input-aria-label="i18n.baseText('desktopAssistant.chat.inputAriaLabel')"
				:send-aria-label="i18n.baseText('desktopAssistant.chat.send')"
				@submit="submit"
			/>
		</div>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.composer {
	padding: var(--spacing--xs);
	background: var(--da-bg);
	border-top: 1px solid var(--da-border);
}
</style>
