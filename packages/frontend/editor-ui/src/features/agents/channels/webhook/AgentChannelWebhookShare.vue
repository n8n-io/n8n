<script setup lang="ts">
// SPIKE (agent-chat-embed): hosted chat link + embed snippet. Copy is hard-coded, not i18n.
import { N8nCopyInput, N8nInput, N8nLink, N8nText } from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { computed } from 'vue';

const props = defineProps<{ baseUrl: string; enabled: boolean }>();
const chatUrl = computed(() => `${props.baseUrl}/chat`);
const snippet = computed(
	() => `<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
  createChat({
    webhookUrl: '${chatUrl.value}',
    enableStreaming: true,
    loadPreviousSession: false,
    showWelcomeScreen: false,
    initialMessages: ['Hi! How can I help?'],
  });
</${'script'}>`,
);
const { copy, copied } = useClipboard();
</script>

<template>
	<div :class="$style.share" data-testid="webhook-share">
		<N8nText size="small" bold>Chat page &amp; embed (spike)</N8nText>
		<N8nText v-if="!enabled" size="small" color="text-light">
			Choose authentication “None” and publish the agent to share a chat page or embed it.
		</N8nText>
		<template v-else>
			<N8nText size="small" color="text-light">
				Anyone with this link can chat with the published agent. No login.
				<N8nLink :to="chatUrl" new-window size="small">Open</N8nLink>
			</N8nText>
			<N8nCopyInput :value="chatUrl" size="medium" data-testid="webhook-chat-url" />
			<N8nText size="small" color="text-light">
				Embed on any website: paste before &lt;/body&gt;.
				<N8nLink size="small" @click="copy(snippet)">{{ copied ? 'Copied' : 'Copy snippet' }}</N8nLink>
			</N8nText>
			<N8nInput
				:model-value="snippet"
				type="textarea"
				:rows="6"
				readonly
				data-testid="webhook-embed-snippet"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.share {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
