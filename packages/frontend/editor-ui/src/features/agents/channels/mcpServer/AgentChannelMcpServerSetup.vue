<script setup lang="ts">
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import { getAgentWebhookUrl } from '../../composables/useAgentApi';
import type { AgentChannelViewProps } from '../types';
import AgentChannelMcpServerClientConfig from './AgentChannelMcpServerClientConfig.vue';

defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const serverUrl = ref('');

/** The MCP server sits next to the API channel of the same agent. */
async function loadServerUrl() {
	try {
		const { url } = await getAgentWebhookUrl(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		serverUrl.value = `${url}/mcp`;
	} catch {
		// The view stays usable without the URL. It shows after the modal opens again.
	}
}
onMounted(loadServerUrl);

const showPublishNotice = computed(() => props.connected && !props.isPublished);

/** Callers sign in with their n8n account, so the channel never needs a credential. */
defineExpose({ credentialRequired: false });
</script>

<template>
	<div :class="$style.mcpServerSetup" tabindex="-1" data-agent-modal-autofocus>
		<N8nCallout v-if="showPublishNotice" theme="warning" data-testid="mcp-server-publish-notice">
			{{ i18n.baseText('agents.channels.mcpServer.publishNotice') }}
		</N8nCallout>

		<AgentChannelMcpServerClientConfig
			v-if="serverUrl"
			:agent-name="props.agentName"
			:url="serverUrl"
		/>

		<N8nText :class="$style.access" size="small" data-testid="mcp-server-access">
			{{ i18n.baseText('agents.channels.mcpServer.access') }}
		</N8nText>

		<N8nButton
			v-if="props.mode === 'setup' && !props.connected"
			variant="outline"
			:class="$style.connectButton"
			:disabled="props.loading"
			:loading="props.loading"
			data-testid="mcp-server-connect"
			@click="emit('connect')"
		>
			{{ i18n.baseText('generic.done') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.mcpServerSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);

	&:focus {
		outline: none;
	}
}

.access {
	color: var(--text-color--subtle);
}

.connectButton {
	align-self: flex-start;
}
</style>
